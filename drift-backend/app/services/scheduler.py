import datetime
import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import Task

def generate_rescue_schedule(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Calendar Rescue Scheduler (Greedy Earliest-Deadline-First Algorithm)
    
    Algorithm:
    1. Collect all active tasks for the user, sorted by current_deadline ascending.
    2. For each task that has been extended (delayed):
       - Calculate required work hours based on extension length (2 hours per day extended).
       - Determine how many 2-hour blocks are needed.
    3. starting from tomorrow, greedily assign blocks to available slots (weekdays 9am-6pm).
       - Slots: 09:00-11:00, 11:00-13:00, 14:00-16:00, 16:00-18:00 (with lunch 13:00-14:00).
       - Higher-priority tasks (earlier deadlines) get assigned first, taking up slots.
       - Lower-priority tasks skip already occupied slots.
    4. Return list of assigned blocks.
    """
    # 1. Collect active tasks sorted by current_deadline ascending
    active_tasks = (
        db.query(Task)
        .filter(Task.user_id == user_id, Task.status == "active")
        .order_on(Task.current_deadline.asc()) # Wait, sqlalchemy uses order_by, not order_on. Let's fix that!
    )
    # Let's fix order_on to order_by
    active_tasks = (
        db.query(Task)
        .filter(Task.user_id == user_id, Task.status == "active")
        .order_by(Task.current_deadline.asc())
        .all()
    )

    scheduled_blocks = []
    occupied_slots = set()  # Set of (date_str, slot_index) to track filled slots

    # We start scheduling starting from tomorrow
    start_date = datetime.date.today() + datetime.timedelta(days=1)

    for task in active_tasks:
        # Check if task is delayed (has extensions)
        extensions = task.extensions
        if not extensions:
            continue

        # 2. Calculate required hours based on extensions: 2 hours per day extended
        total_extended_days = sum(e.extended_by_days for e in extensions)
        required_hours = total_extended_days * 2
        blocks_needed = math.ceil(required_hours / 2)

        if blocks_needed == 0:
            continue

        # 3. Greedily find next available weekday slots
        blocks_assigned = 0
        current_check_date = start_date
        
        # Max safety check to prevent infinite loop (cap at 60 days out)
        days_searched = 0
        while blocks_assigned < blocks_needed and days_searched < 60:
            # Check if current_check_date is a weekday (Monday=0 ... Friday=4, Saturday=5, Sunday=6)
            if current_check_date.weekday() >= 5:
                # Weekend, skip to next day
                current_check_date += datetime.timedelta(days=1)
                days_searched += 1
                continue

            # Check the four 2-hour slots of the day:
            # Slot 0: 09:00 - 11:00
            # Slot 1: 11:00 - 13:00
            # Slot 2: 14:00 - 16:00
            # Slot 3: 16:00 - 18:00
            slots_info = [
                ("09:00", "11:00"),
                ("11:00", "13:00"),
                ("14:00", "16:00"),
                ("16:00", "18:00")
            ]

            date_str = current_check_date.strftime("%Y-%m-%d")

            for slot_idx, (start_time, end_time) in enumerate(slots_info):
                slot_key = (date_str, slot_idx)
                
                # If slot is free, assign it
                if slot_key not in occupied_slots:
                    occupied_slots.add(slot_key)
                    
                    scheduled_blocks.append({
                        "start": f"{date_str} {start_time}",
                        "end": f"{date_str} {end_time}",
                        "label": task.title
                    })
                    
                    blocks_assigned += 1
                    if blocks_assigned >= blocks_needed:
                        break

            # Move to the next day
            current_check_date += datetime.timedelta(days=1)
            days_searched += 1

    # Sort the resulting schedule chronologically by start time
    scheduled_blocks.sort(key=lambda x: x["start"])
    return scheduled_blocks
