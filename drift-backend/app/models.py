import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    interventions = relationship("InterventionLog", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    original_deadline = Column(DateTime, nullable=False)
    current_deadline = Column(DateTime, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, completed, overdue
    drift_score = Column(Integer, default=50, nullable=False)
    drift_explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tasks")
    extensions = relationship("Extension", back_populates="task", cascade="all, delete-orphan")
    schedule_suggestions = relationship("ScheduleSuggestion", back_populates="task", cascade="all, delete-orphan")
    interventions = relationship("InterventionLog", back_populates="task", cascade="all, delete-orphan")


class Extension(Base):
    __tablename__ = "extensions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    extended_by_days = Column(Integer, nullable=False)
    raw_reason = Column(Text, nullable=True)
    raw_transcription = Column(Text, nullable=True)
    ai_tag = Column(String, nullable=True)  # Technical Blocker, Underestimated Effort, External Dependency, Scope Creep, Personal
    ai_reflection = Column(Text, nullable=True)
    severity = Column(Integer, nullable=True)  # 1, 2, 3
    input_method = Column(String, nullable=False)  # voice, text
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="extensions")


class ScheduleSuggestion(Base):
    __tablename__ = "schedule_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    suggested_blocks = Column(JSON, nullable=False)  # Array of {start: datetime, end: datetime, label: string}
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    auto_triggered = Column(Boolean, default=True, nullable=False)

    # Relationships
    task = relationship("Task", back_populates="schedule_suggestions")


class InterventionLog(Base):
    __tablename__ = "intervention_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    intervention_type = Column(String, nullable=False)  # zero_subtasks, high_drift, many_extensions
    message = Column(Text, nullable=False)
    dismissed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="interventions")
    task = relationship("Task", back_populates="interventions")
