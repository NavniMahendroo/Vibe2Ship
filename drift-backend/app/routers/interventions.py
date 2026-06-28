from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_db
from .. import models, schemas, auth
from ..services.intervention_engine import evaluate_interventions

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])


@router.get("", response_model=List[schemas.InterventionOut])
async def get_interventions(
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Fetch all active, undismissed behavioral alerts.
    Triggers the intervention check dynamically on every request.
    Using a synchronous database session fallback for evaluation engine.
    """
    from ..database import SessionLocal
    with SessionLocal() as sync_db:
        # Run synchronous intervention evaluation
        evaluate_interventions(sync_db, current_user.id)
        
    # Query undismissed alerts asynchronously to return them
    result = await db.execute(
        select(models.InterventionLog)
        .filter(models.InterventionLog.user_id == current_user.id, models.InterventionLog.dismissed == False)
    )
    alerts = result.scalars().all()
    return alerts


@router.put("/{intervention_id}/dismiss", response_model=schemas.InterventionOut)
async def dismiss_intervention(
    intervention_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Dismiss a specific intervention banner, ensuring it is hidden in future queries.
    """
    result = await db.execute(
        select(models.InterventionLog)
        .filter(models.InterventionLog.id == intervention_id, models.InterventionLog.user_id == current_user.id)
    )
    log = result.scalars().first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervention alert not found or unauthorized access"
        )
        
    log.dismissed = True
    await db.commit()
    await db.refresh(log)
    return log
