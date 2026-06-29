from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, auth
from ..services.intervention_engine import evaluate_interventions

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])


@router.get("", response_model=List[schemas.InterventionOut])
def get_interventions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Fetch all active, undismissed behavioral alerts.
    Triggers the intervention check dynamically on every request.
    """
    # Run intervention evaluation
    evaluate_interventions(db, current_user.id)
    
    # Query undismissed alerts
    alerts = db.query(models.InterventionLog).filter(
        models.InterventionLog.user_id == current_user.id, 
        models.InterventionLog.dismissed == False
    ).all()
    return alerts


@router.put("/{intervention_id}/dismiss", response_model=schemas.InterventionOut)
def dismiss_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Dismiss a specific intervention banner, ensuring it is hidden in future queries.
    """
    log = db.query(models.InterventionLog).filter(
        models.InterventionLog.id == intervention_id, 
        models.InterventionLog.user_id == current_user.id
    ).first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervention alert not found or unauthorized access"
        )
        
    log.dismissed = True
    db.commit()
    db.refresh(log)
    return log
