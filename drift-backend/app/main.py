from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from . import models, schemas, auth
from .routers import tasks, extensions, schedule, insights, interventions

# Create database tables (SQLite will create drift.db, PostgreSQL will use database_url)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Drift API",
    description="Backend services for Drift — the deadline-rescue AI productivity app.",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(tasks.router)
app.include_router(extensions.router)
app.include_router(schedule.router)
app.include_router(interventions.router)
app.include_router(insights.router)


@app.get("/api")
def read_root():
    return {
        "status": "healthy",
        "app": "Drift Backend Services",
        "message": "Know why you're late. Stop being late."
    }


# ----------------- Auth Endpoints -----------------

@app.post("/api/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user in the Drift application.
    """
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
        
    hashed_password = auth.get_password_hash(user_in.password)
    
    new_user = models.User(
        email=user_in.email,
        name=user_in.name,
        password_hash=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Log in a user and return a JWT access token.
    """
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not auth.verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth.create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/api/auth/me", response_model=schemas.UserOut)
def get_user_me(current_user: models.User = Depends(auth.get_current_user)):
    """
    Fetch the currently authenticated user's profile.
    """
    return current_user
