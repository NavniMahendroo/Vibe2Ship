import datetime
import logging
from typing import Optional
from sqlalchemy import func, select
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_db
from .. import models, schemas, auth
from ..services import gemini_service, scheduler
from ..services.drift_engine import calculate_drift_score

router = APIRouter(prefix="/api/extensions", tags=["Extensions"])
logger = logging.getLogger(__name__)


async def process_extension_background(
    extension_id: int,
    raw_reason: Optional[str] = None,
    input_method: str = "text",
    audio_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None
):
    """
    Background worker that runs the Gemini API analysis, updates the extension tag/reflection,
    extends the task deadline, recalculates drift score, and regenerates the rescue schedule.
    Using a synchronous database session for consistency with the sync scheduler and drift engine.
    """
    from ..database import SessionLocal
    with SessionLocal() as db_session:
        try:
            # 1. Fetch extension and task records
            extension = db_session.query(models.Extension).filter(models.Extension.id == extension_id).first()
            if not extension:
                logger.error(f"Background task failed: Extension {extension_id} not found.")
                return

            task = db_session.query(models.Task).filter(models.Task.id == extension.task_id).first()
            if not task:
                logger.error(f"Background task failed: Task for extension {extension_id} not found.")
                return

            user_id = task.user_id

            # 2. Gather user's task history in this category for Gemini context
            past_extensions = (
                db_session.query(models.Extension)
                .join(models.Task)
                .filter(
                    models.Task.user_id == user_id,
                    func.lower(models.Task.category) == task.category.lower(),
                    models.Extension.id != extension_id  # Exclude current extension
                )
                .all()
            )

            tag_counts = {}
            for ext in past_extensions:
                # Ignore temporary status tags in history
                if ext.ai_tag and ext.ai_tag not in ["processing", "failed"]:
                    tag_counts[ext.ai_tag] = tag_counts.get(ext.ai_tag, 0) + 1

            summary_parts = [f"{tag}: {count} time(s)" for tag, count in tag_counts.items()]
            history_summary = ", ".join(summary_parts) if summary_parts else "No prior extensions in this category."

            # 3. Call Gemini text/audio analysis service
            analysis_result = None
            if input_method == "voice" and audio_bytes:
                try:
                    analysis_result = await gemini_service.analyze_extension_audio(
                        audio_bytes=audio_bytes,
                        mime_type=mime_type or "audio/wav",
                        history_summary=history_summary
                    )
                except Exception as e:
                    logger.error(f"Failed to perform background Gemini audio analysis: {e}")
                    analysis_result = gemini_service.get_fallback_analysis("Voice recording uploaded.", history_summary)
            else:
                try:
                    analysis_result = await gemini_service.analyze_extension_text(
                        reason_text=raw_reason or "No reason provided",
                        history_summary=history_summary
                    )
                except Exception as e:
                    logger.error(f"Failed to perform background Gemini text analysis: {e}")
                    analysis_result = gemini_service.get_fallback_analysis(raw_reason or "No reason provided", history_summary)

            # 4. Save Gemini analysis to Extension record
            extension.raw_transcription = analysis_result.get("transcription")
            extension.ai_tag = analysis_result.get("tag")
            extension.ai_reflection = analysis_result.get("reflection")
            extension.severity = analysis_result.get("severity")
            db_session.commit()

            # 5. Extend the task deadline
            task.current_deadline = task.current_deadline + datetime.timedelta(days=extension.extended_by_days)
            db_session.commit()

            # 6. Recalculate Task Drift Score
            score, explanation = calculate_drift_score(
                db=db_session,
                user_id=user_id,
                title=task.title,
                category=task.category,
                deadline=task.current_deadline
            )
            task.drift_score = score
            task.drift_explanation = explanation
            db_session.commit()

            # 7. Auto-trigger Rescue Scheduler
            suggested_blocks = scheduler.generate_rescue_schedule(db_session, user_id)

            # Delete old suggestion and save new auto-triggered suggestion
            db_session.query(models.ScheduleSuggestion).filter(models.ScheduleSuggestion.task_id == task.id).delete()
            new_schedule = models.ScheduleSuggestion(
                task_id=task.id,
                suggested_blocks=suggested_blocks,
                auto_triggered=True
            )
            db_session.add(new_schedule)
            db_session.commit()

            logger.info(f"Background task completed successfully for extension {extension_id}.")

        except Exception as e:
            logger.error(f"Critical error in process_extension_background for extension {extension_id}: {e}")
            try:
                # Recover and save a fallback state to prevent app crash
                fallback_ext = db_session.query(models.Extension).filter(models.Extension.id == extension_id).first()
                if fallback_ext:
                    fallback_ext.ai_tag = "failed"
                    fallback_ext.ai_reflection = "AI Coach analysis failed. Please review task schedule manual override."
                    fallback_ext.severity = 1
                    db_session.commit()
            except Exception as inner_e:
                logger.error(f"Failed to save fallback status for extension {extension_id}: {inner_e}")


@router.post("/{task_id}", status_code=status.HTTP_202_ACCEPTED)
async def log_extension(
    task_id: int,
    background_tasks: BackgroundTasks,
    extended_by_days: int = Form(...),
    input_method: str = Form(...),
    raw_reason: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Log a new task extension. Accepts voice or text inputs.
    Validates input and immediately returns 202 Accepted, queuing Gemini processing 
    and rescue scheduling as a background task to keep endpoints non-blocking.
    """
    # 1. Verify task ownership
    result = await db.execute(
        select(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id)
    )
    task = result.scalars().first()
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

    # 2. Input validation for voice and text methods
    audio_bytes = None
    mime_type = None

    if input_method == "voice":
        if not audio_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voice input method selected but no audio file uploaded"
            )
        audio_bytes = await audio_file.read()
        mime_type = audio_file.content_type or "audio/wav"
    elif input_method == "text":
        if not raw_reason or not raw_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text input method selected but no reason text provided"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input method. Must be 'voice' or 'text'."
        )

    # 3. Create extension record immediately in processing state
    new_extension = models.Extension(
        task_id=task.id,
        extended_by_days=extended_by_days,
        raw_reason=raw_reason if input_method == "text" else None,
        raw_transcription="Processing transcription..." if input_method == "voice" else None,
        ai_tag="processing",
        ai_reflection="Analyzing extension reason with AI Coach...",
        severity=1,
        input_method=input_method
    )
    db.add(new_extension)
    await db.commit()
    await db.refresh(new_extension)

    # 4. Dispatch background job
    background_tasks.add_task(
        process_extension_background,
        extension_id=new_extension.id,
        raw_reason=raw_reason,
        input_method=input_method,
        audio_bytes=audio_bytes,
        mime_type=mime_type
    )

    return {
        "status": "processing",
        "extension_id": new_extension.id,
        "message": "AI analysis in progress"
    }


@router.get("/{extension_id}", response_model=schemas.ExtensionOut)
async def get_extension_status(
    extension_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get the status of a specific extension (used for polling async background analysis).
    """
    result = await db.execute(
        select(models.Extension)
        .join(models.Task)
        .filter(models.Extension.id == extension_id, models.Task.user_id == current_user.id)
    )
    ext = result.scalars().first()
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extension not found or unauthorized access"
        )
    return ext
