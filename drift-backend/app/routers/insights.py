from typing import List, Dict
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("", response_model=schemas.InsightsOut)
def get_insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Generate comprehensive user behavioral insight charts and stats.
    Computes completion streaks, AI coach category ratios, and the Drift Hall of Fame.
    """
    user_tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    total_tasks = len(user_tasks)

    # 1. Base Fallback for Zero Tasks
    if total_tasks == 0:
        return schemas.InsightsOut(
            metrics=schemas.InsightsMetrics(
                total_tasks=0,
                completion_rate=0.0,
                average_drift_score=50.0,
                most_common_tag="None",
                total_extensions=0,
                longest_streak=0
            ),
            tag_distribution=[],
            drift_over_time=[],
            category_breakdown=[],
            hall_of_fame=[]
        )

    # Calculate status groups and extensions
    completed_tasks = [t for t in user_tasks if t.status == "completed"]
    completed_count = len(completed_tasks)
    
    # Track extensions globally and by category
    all_extensions = []
    category_extensions_map = defaultdict(list)
    category_tasks_map = defaultdict(list)
    tag_counts = defaultdict(int)

    for task in user_tasks:
        cat = task.category.strip()
        category_tasks_map[cat].append(task)
        
        task_exts = task.extensions
        all_extensions.extend(task_exts)
        category_extensions_map[cat].extend(task_exts)
        
        for ext in task_exts:
            if ext.ai_tag:
                tag_counts[ext.ai_tag] += 1

    total_extensions = len(all_extensions)
    completion_rate = (completed_count / total_tasks) * 100.0

    avg_drift = sum(t.drift_score for t in user_tasks) / total_tasks

    # Find most common tag
    most_common_tag = "None"
    if tag_counts:
        most_common_tag = max(tag_counts, key=tag_counts.get)

    # Calculate longest streak without extension
    # Defined as: completed tasks in a row (sorted by creation time) that had 0 extensions
    completed_tasks_sorted = sorted(completed_tasks, key=lambda x: x.created_at)
    
    longest_streak = 0
    current_streak = 0
    for task in completed_tasks_sorted:
        # A task has no extensions if its list is empty
        if len(task.extensions) == 0 and task.current_deadline <= task.original_deadline:
            current_streak += 1
            if current_streak > longest_streak:
                longest_streak = current_streak
        else:
            current_streak = 0

    # Tag Distribution data
    tag_distribution = [
        schemas.TagCount(tag=tag, count=count) 
        for tag, count in tag_counts.items()
    ]
    tag_distribution.sort(key=lambda x: x.count, reverse=True)

    # Drift over time data
    # Group tasks by created_at date
    date_drift_scores = defaultdict(list)
    for task in user_tasks:
        date_str = task.created_at.strftime("%Y-%m-%d")
        date_drift_scores[date_str].append(task.drift_score)

    drift_over_time = [
        schemas.DriftPoint(date=d, avg_drift_score=sum(scores)/len(scores))
        for d, scores in date_drift_scores.items()
    ]
    drift_over_time.sort(key=lambda x: x.date)

    # For UI demonstration: if all tasks were created on the same day,
    # generate a yesterday baseline point so a line graph is rendered.
    if len(drift_over_time) == 1 and len(user_tasks) >= 2:
        yesterday_str = (datetime.date.today() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        drift_over_time.insert(0, schemas.DriftPoint(date=yesterday_str, avg_drift_score=50.0))

    # Category breakdown table data
    category_breakdown = []
    for category, tasks in category_tasks_map.items():
        # Count tasks in category that had at least one extension
        extended_tasks = [t for t in tasks if len(t.extensions) > 0 or t.current_deadline > t.original_deadline]
        ext_rate = (len(extended_tasks) / len(tasks)) * 100.0
        
        # Calculate total extensions divided by total tasks in this category
        cat_exts_count = len(category_extensions_map[category])
        avg_exts = cat_exts_count / len(tasks)
        
        category_breakdown.append(schemas.CategoryStats(
            category=category,
            task_count=len(tasks),
            extension_rate=round(ext_rate, 2),
            avg_extensions=round(avg_exts, 2)
        ))
    category_breakdown.sort(key=lambda x: x.task_count, reverse=True)

    # Drift Hall of Fame data: top 3 tasks with the most extensions
    hall_of_fame_tasks = sorted(
        user_tasks, 
        key=lambda x: len(x.extensions), 
        reverse=True
    )
    
    hall_of_fame = []
    for task in hall_of_fame_tasks[:3]:
        ext_count = len(task.extensions)
        if ext_count > 0:
            # Extract unique tag badges associated with the extensions
            tags = list({ext.ai_tag for ext in task.extensions if ext.ai_tag})
            hall_of_fame.append(schemas.HallOfFameTask(
                id=task.id,
                title=task.title,
                extension_count=ext_count,
                tags=tags
            ))

    return schemas.InsightsOut(
        metrics=schemas.InsightsMetrics(
            total_tasks=total_tasks,
            completion_rate=round(completion_rate, 2),
            average_drift_score=round(avg_drift, 2),
            most_common_tag=most_common_tag,
            total_extensions=total_extensions,
            longest_streak=longest_streak
        ),
        tag_distribution=tag_distribution,
        drift_over_time=drift_over_time,
        category_breakdown=category_breakdown,
        hall_of_fame=hall_of_fame
    )
