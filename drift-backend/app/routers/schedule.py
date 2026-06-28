from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_db
from .. import models, schemas, auth
from ..services import scheduler

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])


@router.get("", response_model=List[schemas.ScheduleBlock])
async def get_overall_schedule(
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get the overall dynamic rescue schedule for the user,
    consolidating blocks across all active tasks.
    Using a synchronous database session fallback for schedule engine.
    """
    from ..database import SessionLocal
    with SessionLocal() as sync_db:
        blocks = scheduler.generate_rescue_schedule(sync_db, current_user.id)
    return blocks


@router.get("/task/{task_id}", response_model=schemas.ScheduleSuggestionOut)
async def get_task_schedule(
    task_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get the saved auto-generated schedule blocks specific to a single task.
    """
    # Verify task ownership
    result_task = await db.execute(
        select(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id)
    )
    task = result_task.scalars().first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized access"
        )
        
    result_sug = await db.execute(
        select(models.ScheduleSuggestion).filter(models.ScheduleSuggestion.task_id == task_id)
    )
    suggestion = result_sug.scalars().first()
    
    if not suggestion:
        # If no schedule exists yet, run it on-the-fly via synchronous database session
        from ..database import SessionLocal
        with SessionLocal() as sync_db:
            blocks = scheduler.generate_rescue_schedule(sync_db, current_user.id)
            
            # Save it
            suggestion = models.ScheduleSuggestion(
                task_id=task_id,
                suggested_blocks=blocks,
                auto_triggered=True
            )
            sync_db.add(suggestion)
            sync_db.commit()
            sync_db.refresh(suggestion)
            
        # Re-fetch via async session to avoid detached instance issues during serialization
        result_sug = await db.execute(
            select(models.ScheduleSuggestion).filter(models.ScheduleSuggestion.task_id == task_id)
        )
        suggestion = result_sug.scalars().first()
        
    return suggestion


@router.post("/regenerate", response_model=List[schemas.ScheduleBlock])
async def regenerate_schedule(
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Manually force-trigger regeneration of schedules for all active tasks,
    syncing the cache in the database and returning the updated timeline blocks.
    """
    from ..database import SessionLocal
    with SessionLocal() as sync_db:
        # 1. Generate consolidated blocks
        blocks = scheduler.generate_rescue_schedule(sync_db, current_user.id)
        
        # 2. Update the ScheduleSuggestion record for each active user task
        active_tasks = (
            sync_db.query(models.Task)
            .filter(models.Task.user_id == current_user.id, models.Task.status == "active")
            .all()
        )
        
        for task in active_tasks:
            # Filter blocks that belong to this task (by matching label with task title)
            task_blocks = [b for b in blocks if b["label"] == task.title]
            
            # Delete old suggestion
            sync_db.query(models.ScheduleSuggestion).filter(models.ScheduleSuggestion.task_id == task.id).delete()
            
            # Add new suggestion if there are blocks
            if task_blocks:
                new_suggestion = models.ScheduleSuggestion(
                    task_id=task.id,
                    suggested_blocks=task_blocks,
                    auto_triggered=False  # Manually triggered
                )
                sync_db.add(new_suggestion)
                
        sync_db.commit()
        
    return blocks
