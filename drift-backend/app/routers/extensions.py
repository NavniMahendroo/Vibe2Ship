import datetime
import logging
from typing import Optional
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, auth
from ..services import gemini_service, scheduler
from ..services.drift_engine import calculate_drift_score

router = APIRouter(prefix="/api/extensions", tags=["Extensions"])
logger = logging.getLogger(__name__)

@router.post("/{task_id}", response_model=schemas.ExtensionOut)
async def log_extension(
    task_id: int,
    extended_by_days: int = Form(...),
    input_method: str = Form(...),
    raw_reason: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Log a new task extension. Accepts voice or text inputs.
    Invokes Gemini API for audio transcription + coach tagging,
    updates task current_deadline & drift score, and regenerates rescue schedules.
    """
    try:
        task = (
            db.query(models.Task)
            .filter(models.Task.id == task_id, models.Task.user_id == current_user.id)
            .first()
        )
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or unauthorized access"
            )
            
        if task.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot extend a completed task."
            )

        # 1. Fetch user extension history in this category for coach context
        past_extensions = (
            db.query(models.Extension)
            .join(models.Task)
            .filter(
                models.Task.user_id == current_user.id,
                func.lower(models.Task.category) == task.category.lower()
            )
            .all()
        )
        
        tag_counts = {}
        for ext in past_extensions:
            tag = ext.ai_tag or "Unknown"
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
        summary_parts = [f"{tag}: {count} time(s)" for tag, count in tag_counts.items()]
        history_summary = ", ".join(summary_parts) if summary_parts else "No prior extensions in this category."

        # 2. Invoke Gemini for transcription and analysis
        analysis_result = None
        
        if input_method == "voice":
            if not audio_file:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Voice input method selected but no audio file uploaded"
                )
            try:
                # Read audio bytes
                audio_bytes = await audio_file.read()
                mime_type = audio_file.content_type or "audio/wav"
                
                # Request single transcription + coaching assessment
                analysis_result = gemini_service.analyze_extension_audio(
                    audio_bytes=audio_bytes,
                    mime_type=mime_type,
                    history_summary=history_summary
                )
            except Exception as e:
                logger.error(f"Error handling voice note file: {e}")
                analysis_result = gemini_service.get_fallback_analysis("Voice recording uploaded.", history_summary)
                
        elif input_method == "text":
            if not raw_reason or not raw_reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Text input method selected but no reason text provided"
                )
            try:
                analysis_result = gemini_service.analyze_extension_text(
                    reason_text=raw_reason,
                    history_summary=history_summary
                )
            except Exception as e:
                logger.error(f"Error in Gemini text analysis: {e}")
                analysis_result = gemini_service.get_fallback_analysis(raw_reason, history_summary)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid input method. Must be 'voice' or 'text'."
            )

        # 3. Save new extension record to the database
        new_extension = models.Extension(
            task_id=task.id,
            extended_by_days=extended_by_days,
            raw_reason=raw_reason if input_method == "text" else None,
            raw_transcription=analysis_result.get("transcription"),
            ai_tag=analysis_result.get("tag"),
            ai_reflection=analysis_result.get("reflection"),
            severity=analysis_result.get("severity"),
            input_method=input_method
        )
        db.add(new_extension)
        db.commit()
        db.refresh(new_extension)

        # 4. Update the task deadline (original_deadline stays immutable)
        # Convert naive current_deadline to naive datetime calculation
        task.current_deadline = task.current_deadline + datetime.timedelta(days=extended_by_days)
        
        # 5. Recalculate the task Drift Score
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

        # 6. Auto-Trigger Rescue Scheduler (Autonomous Intervention)
        # Generate schedule for all active tasks
        suggested_blocks = scheduler.generate_rescue_schedule(db, current_user.id)
        
        # Save the updated suggestion for this task in the database
        db.query(models.ScheduleSuggestion).filter(models.ScheduleSuggestion.task_id == task.id).delete()
        
        new_schedule = models.ScheduleSuggestion(
            task_id=task.id,
            suggested_blocks=suggested_blocks,
            auto_triggered=True
        )
        db.add(new_schedule)
        db.commit()

        return new_extension
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in log_extension: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit extension: {str(e)}"
        )
