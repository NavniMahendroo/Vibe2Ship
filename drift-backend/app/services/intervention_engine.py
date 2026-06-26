import datetime
from sqlalchemy.orm import Session
from ..models import Task, InterventionLog, Extension

def parse_subtask_progress(description: str) -> tuple[int, int]:
    """
    Parses description for markdown checkbox patterns:
    - Unchecked: [ ]
    - Checked: [x] or [X]
    Returns (total_checkboxes, checked_checkboxes)
    """
    if not description:
        return 0, 0
    
    unchecked_count = description.count("[ ]")
    checked_count = description.count("[x]") + description.count("[X]")
    total = unchecked_count + checked_count
    return total, checked_count


def evaluate_interventions(db: Session, user_id: int) -> list[InterventionLog]:
    """
    Runs background check on all active tasks for:
    (a) Due within 48h with 0 subtasks checked off.
    (b) Drift score > 70% and due within 7 days.
    (c) Extended 3+ times.
    
    Syncs with InterventionLog table, keeping dismissed state intact.
    """
    now = datetime.datetime.utcnow()
    active_tasks = db.query(Task).filter(Task.user_id == user_id, Task.status == "active").all()
    
    # Calculate historical category rates to customize alert messages
    category_rates = {}
    all_user_tasks = db.query(Task).filter(Task.user_id == user_id).all()
    if all_user_tasks:
        for t in all_user_tasks:
            cat = t.category.lower()
            if cat not in category_rates:
                cat_tasks = [x for x in all_user_tasks if x.category.lower() == cat]
                cat_extended = [x for x in cat_tasks if (x.current_deadline > x.original_deadline) or (len(x.extensions) > 0)]
                category_rates[cat] = int((len(cat_extended) / len(cat_tasks)) * 100)

    active_alerts = []  # List of tuples: (task_id, intervention_type, message)

    for task in active_tasks:
        time_to_deadline = task.current_deadline - now
        hours_remaining = int(time_to_deadline.total_seconds() / 3600)
        days_remaining = time_to_deadline.days
        ext_count = len(task.extensions)
        cat_rate = category_rates.get(task.category.lower(), 50)

        # Condition (a): Due within 48 hours and 0 subtasks checked off
        if 0 < hours_remaining <= 48:
            _, checked = parse_subtask_progress(task.description)
            if checked == 0:
                msg = (
                    f"You have a major task '{task.title}' due in {hours_remaining} hours. "
                    f"Historically you extend this category {cat_rate}% of the time. Your rescue schedule is ready."
                )
                active_alerts.append((task.id, "zero_subtasks", msg))
                continue  # Avoid duplicate alerts for the same task

        # Condition (b): Drift score > 70% and deadline within 7 days
        if task.drift_score > 70 and 0 < days_remaining <= 7:
            msg = (
                f"Warning: '{task.title}' has a high drift risk of {task.drift_score}%. "
                f"Historically you extend {task.category.lower()} tasks. Your rescue schedule is ready."
            )
            active_alerts.append((task.id, "high_drift", msg))
            continue

        # Condition (c): Task extended 3+ times
        if ext_count >= 3:
            msg = (
                f"Alert: '{task.title}' has been extended {ext_count} times. "
                f"Historically you extend this category. Your rescue schedule is ready."
            )
            active_alerts.append((task.id, "many_extensions", msg))

    # Sync with Database InterventionLog
    # 1. Fetch current active logs for this user (undismissed + dismissed)
    existing_logs = db.query(InterventionLog).filter(InterventionLog.user_id == user_id).all()
    existing_map = {(log.task_id, log.intervention_type): log for log in existing_logs}

    current_keys = set()
    new_logs_to_add = []

    for task_id, int_type, msg in active_alerts:
        key = (task_id, int_type)
        current_keys.add(key)
        
        if key in existing_map:
            # If it already exists and is dismissed, keep it as is.
            # If it exists and is not dismissed, we can update the message text.
            log = existing_map[key]
            if not log.dismissed:
                log.message = msg
        else:
            # Create a new alert log
            new_log = InterventionLog(
                user_id=user_id,
                task_id=task_id,
                intervention_type=int_type,
                message=msg,
                dismissed=False
            )
            new_logs_to_add.append(new_log)

    if new_logs_to_add:
        db.add_all(new_logs_to_add)
        db.commit()

    # Delete undismissed database alerts that are no longer active (e.g. task completed/extended past window)
    for key, log in existing_map.items():
        if key not in current_keys and not log.dismissed:
            db.delete(log)
    
    db.commit()

    # Return only active, undismissed alerts for the user
    return (
        db.query(InterventionLog)
        .filter(InterventionLog.user_id == user_id, InterventionLog.dismissed == False)
        .all()
    )
