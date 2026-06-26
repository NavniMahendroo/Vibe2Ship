import pytest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import User, Task, Extension, ScheduleSuggestion, InterventionLog
from app.services.drift_engine import calculate_drift_score
from app.services.scheduler import generate_rescue_schedule
from app.services.intervention_engine import evaluate_interventions, parse_subtask_progress


# Create an in-memory SQLite database for testing services
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    # Create the tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop the tables to clean up
        Base.metadata.drop_all(bind=engine)


def test_drift_engine_zero_history(db_session):
    # Test case 1: User has no history yet.
    # Should default to 50% with the specified zero-history explanation text.
    user_id = 1
    title = "Implement database schema"
    category = "Database"
    deadline = datetime.datetime.utcnow() + datetime.timedelta(days=3)

    score, explanation = calculate_drift_score(
        db=db_session,
        user_id=user_id,
        title=title,
        category=category,
        deadline=deadline
    )

    assert score == 50
    assert "Not enough history yet" in explanation


def test_drift_engine_with_history(db_session):
    # Setup: Create a user and some history
    user = User(email="test@example.com", name="Test User", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    # Create past tasks: 3 tasks in "Design" category, 2 were extended
    created_at = datetime.datetime.utcnow() - datetime.timedelta(days=10)
    
    # Task 1: Design logo - not extended
    task1 = Task(
        user_id=user.id,
        title="Design logo",
        category="Design",
        original_deadline=created_at + datetime.timedelta(days=5),
        current_deadline=created_at + datetime.timedelta(days=5),
        status="completed",
        created_at=created_at
    )
    # Task 2: Design website - extended by 2 days
    task2 = Task(
        user_id=user.id,
        title="Design website layout",
        category="Design",
        original_deadline=created_at + datetime.timedelta(days=4),
        current_deadline=created_at + datetime.timedelta(days=6),
        status="completed",
        created_at=created_at
    )
    # Task 3: Design business cards - extended by 1 day
    task3 = Task(
        user_id=user.id,
        title="Design business cards",
        category="Design",
        original_deadline=created_at + datetime.timedelta(days=2),
        current_deadline=created_at + datetime.timedelta(days=3),
        status="completed",
        created_at=created_at
    )
    
    db_session.add_all([task1, task2, task3])
    db_session.commit()

    # Log extensions for task 2 and task 3 to populate extensions relationship
    ext1 = Extension(task_id=task2.id, extended_by_days=2, input_method="text", ai_tag="Underestimated Effort")
    ext2 = Extension(task_id=task3.id, extended_by_days=1, input_method="text", ai_tag="Technical Blocker")
    db_session.add_all([ext1, ext2])
    db_session.commit()

    # Now calculate drift score for a new "Design" task
    new_deadline = datetime.datetime.utcnow() + datetime.timedelta(days=2)
    score, explanation = calculate_drift_score(
        db=db_session,
        user_id=user.id,
        title="Design email banners",
        category="Design",
        deadline=new_deadline
    )

    # With historical category rate = 66%, the score should be higher than 50%
    assert score > 50
    assert "Design tasks" in explanation or "Design" in explanation or "probability" in explanation


def test_scheduler_edf_greedy(db_session):
    user = User(email="test@example.com", name="Test User", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    # Create two active tasks that are delayed (have extensions)
    now = datetime.datetime.utcnow()
    
    # Task A: Earlier deadline, extended by 1 day (needs 2 hours = 1 block)
    task_a = Task(
        user_id=user.id,
        title="Task A",
        category="Development",
        original_deadline=now + datetime.timedelta(days=2),
        current_deadline=now + datetime.timedelta(days=2),
        status="active"
    )
    # Task B: Later deadline, extended by 2 days (needs 4 hours = 2 blocks)
    task_b = Task(
        user_id=user.id,
        title="Task B",
        category="Development",
        original_deadline=now + datetime.timedelta(days=4),
        current_deadline=now + datetime.timedelta(days=4),
        status="active"
    )
    
    db_session.add_all([task_a, task_b])
    db_session.commit()

    # Log extensions
    ext_a = Extension(task_id=task_a.id, extended_by_days=1, input_method="text", ai_tag="Technical Blocker")
    ext_b = Extension(task_id=task_b.id, extended_by_days=2, input_method="text", ai_tag="Scope Creep")
    db_session.add_all([ext_a, ext_b])
    db_session.commit()

    # Run scheduler
    schedule = generate_rescue_schedule(db_session, user.id)

    # We expect 3 blocks in total (1 for Task A, 2 for Task B)
    assert len(schedule) == 3
    # Check that Task A is scheduled before Task B due to EDF (Earliest Deadline First)
    assert schedule[0]["label"] == "Task A"
    assert schedule[1]["label"] == "Task B"
    assert schedule[2]["label"] == "Task B"

    # Verify blocks do not overlap (each is on a different weekday slot)
    slots = [(b["start"], b["end"]) for b in schedule]
    assert len(slots) == len(set(slots))  # No duplicates


def test_intervention_engine(db_session):
    user = User(email="test@example.com", name="Test User", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    now = datetime.datetime.utcnow()

    # Task matching condition (a): Due within 48h, 0 subtasks checked off
    task_a = Task(
        user_id=user.id,
        title="Due Soon Empty Checklist",
        category="Research",
        original_deadline=now + datetime.timedelta(hours=24),
        current_deadline=now + datetime.timedelta(hours=24),
        description="Here is some research work:\n- [ ] Draft outline\n- [ ] Survey users",
        status="active"
    )

    # Task matching condition (b): Drift score > 70% and deadline within 7 days
    task_b = Task(
        user_id=user.id,
        title="High Drift Risk Task",
        category="Design",
        original_deadline=now + datetime.timedelta(days=4),
        current_deadline=now + datetime.timedelta(days=4),
        drift_score=85,
        status="active"
    )

    # Task matching condition (c): Extended 3+ times
    task_c = Task(
        user_id=user.id,
        title="Frequently Delayed Task",
        category="Admin",
        original_deadline=now + datetime.timedelta(days=15),
        current_deadline=now + datetime.timedelta(days=15),
        status="active"
    )

    db_session.add_all([task_a, task_b, task_c])
    db_session.commit()

    # Log 3 extensions for task_c to trigger condition (c)
    for i in range(3):
        ext = Extension(task_id=task_c.id, extended_by_days=1, input_method="text", ai_tag="Personal")
        db_session.add(ext)
    db_session.commit()

    # Run intervention evaluate checks
    alerts = evaluate_interventions(db_session, user.id)

    # We should have generated alerts for all three tasks
    assert len(alerts) == 3
    alert_types = {a.intervention_type for a in alerts}
    assert "zero_subtasks" in alert_types
    assert "high_drift" in alert_types
    assert "many_extensions" in alert_types
