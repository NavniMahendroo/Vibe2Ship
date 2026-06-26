from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict, Field

# ----------------- Auth Schemas -----------------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    created_at: datetime


# ----------------- Extension Schemas -----------------

class ExtensionCreate(BaseModel):
    extended_by_days: int = Field(..., gt=0)
    raw_reason: Optional[str] = None
    raw_transcription: Optional[str] = None
    input_method: str = Field(..., pattern="^(voice|text)$")


class ExtensionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    extended_by_days: int
    raw_reason: Optional[str] = None
    raw_transcription: Optional[str] = None
    ai_tag: Optional[str] = None
    ai_reflection: Optional[str] = None
    severity: Optional[int] = None
    input_method: str
    timestamp: datetime


# ----------------- Schedule Schemas -----------------

class ScheduleBlock(BaseModel):
    start: str  # Format: "YYYY-MM-DD HH:MM" or datetime string
    end: str    # Format: "YYYY-MM-DD HH:MM" or datetime string
    label: str


class ScheduleSuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    suggested_blocks: List[Any]  # Will contain parsed list of ScheduleBlock objects
    generated_at: datetime
    auto_triggered: bool


# ----------------- Intervention Schemas -----------------

class InterventionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_id: Optional[int] = None
    intervention_type: str
    message: str
    dismissed: bool
    created_at: datetime


# ----------------- Task Schemas -----------------

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    category: str = Field(..., min_length=1)
    current_deadline: datetime


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    current_deadline: Optional[datetime] = None
    status: Optional[str] = None  # active, completed


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    category: str
    original_deadline: datetime
    current_deadline: datetime
    status: str
    drift_score: int
    drift_explanation: Optional[str] = None
    created_at: datetime
    extensions: List[ExtensionOut] = []
    extension_count: int = 0
    schedule_suggestions: List[ScheduleSuggestionOut] = []


# ----------------- Live Risk Engine Schemas -----------------

class DriftScorePreviewRequest(BaseModel):
    title: str
    category: str
    deadline: datetime


class DriftScorePreviewResponse(BaseModel):
    drift_score: int
    drift_explanation: str


# ----------------- Insights Schemas -----------------

class InsightsMetrics(BaseModel):
    total_tasks: int
    completion_rate: float  # Percentage: 0.0 - 100.0
    average_drift_score: float
    most_common_tag: str
    total_extensions: int
    longest_streak: int  # Completed tasks in a row without extensions


class TagCount(BaseModel):
    tag: str
    count: int


class DriftPoint(BaseModel):
    date: str  # Format: YYYY-MM-DD
    avg_drift_score: float


class CategoryStats(BaseModel):
    category: str
    task_count: int
    extension_rate: float  # Percentage of tasks that were extended
    avg_extensions: float  # Average extensions per task in this category


class HallOfFameTask(BaseModel):
    id: int
    title: str
    extension_count: int
    tags: List[str]


class InsightsOut(BaseModel):
    metrics: InsightsMetrics
    tag_distribution: List[TagCount]
    drift_over_time: List[DriftPoint]
    category_breakdown: List[CategoryStats]
    hall_of_fame: List[HallOfFameTask]
