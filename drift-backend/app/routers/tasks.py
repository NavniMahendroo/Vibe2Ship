import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, auth
from ..services.drift_engine import calculate_drift_score

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def sync_task_statuses(db: Session, user_id: int):
    """
    Auto-computes server-side status:
    If current_deadline has passed and task is still 'active', mark as 'overdue'.
    """
    now = datetime.datetime.utcnow()
    overdue_tasks = db.query(models.Task).filter(
        models.Task.user_id == user_id,
        models.Task.status == "active",
        models.Task.current_deadline < now,
    ).all()
    for task in overdue_tasks:
        task.status = "overdue"
    if overdue_tasks:
        db.commit()


@router.get("", response_model=List[schemas.TaskOut])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieve all tasks for the current user.
    Auto-groups tasks by status (overdue/due soon/active) in the frontend.
    """
    sync_task_statuses(db, current_user.id)
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    
    # Enrich response with extension count
    for t in tasks:
        t.extension_count = len(t.extensions)
        
    return tasks


@router.post("", response_model=schemas.TaskOut)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Create a new task, calculate its initial Drift Score & explanation,
    and save both original_deadline and current_deadline.
    """
    # Calculate drift score preview using Drift Risk Engine
    score, explanation = calculate_drift_score(
        db=db,
        user_id=current_user.id,
        title=task_in.title,
        category=task_in.category,
        deadline=task_in.current_deadline
    )

    new_task = models.Task(
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        category=task_in.category,
        original_deadline=task_in.current_deadline,  # Immutable initial copy
        current_deadline=task_in.current_deadline,
        status="active",
        drift_score=score,
        drift_explanation=explanation
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    new_task.extension_count = 0
    return new_task


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get detailed view of a single task, containing extension logs and scheduler recommendations.
    """
    sync_task_statuses(db, current_user.id)
    task = db.query(models.Task).filter(
        models.Task.id == task_id, 
        models.Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized access"
        )
        
    task.extension_count = len(task.extensions)
    return task


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task_in: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Update core details of the task. Note that deadlines are only extended 
    via the log-extension workflow, but users can complete the task here.
    """
    task = db.query(models.Task).filter(
        models.Task.id == task_id, 
        models.Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized access"
        )

    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.category is not None:
        task.category = task_in.category
    if task_in.status is not None:
        if task_in.status in ["active", "completed"]:
            task.status = task_in.status
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status can only be set to 'active' or 'completed'"
            )

    # Recalculate Drift Score upon editing name/category
    score, explanation = calculate_drift_score(
        db=db,
        user_id=current_user.id,
        title=task.title,
        category=task.category,
        deadline=task.current_deadline
    )
    task.drift_score = score
    task.drift_explanation = explanation

    db.commit()
    db.refresh(task)
    task.extension_count = len(task.extensions)
    return task


@router.post("/drift-score-preview", response_model=schemas.DriftScorePreviewResponse)
def get_drift_score_preview(
    payload: schemas.DriftScorePreviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Live Drift Score Preview endpoint.
    Invoked dynamically as the user fills out the New Task creation form.
    """
    score, explanation = calculate_drift_score(
        db=db,
        user_id=current_user.id,
        title=payload.title,
        category=payload.category,
        deadline=payload.deadline
    )
    
    return schemas.DriftScorePreviewResponse(
        drift_score=score,
        drift_explanation=explanation
    )
