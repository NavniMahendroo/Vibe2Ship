import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./drift.db")

# Normalize database URL protocol for SQLAlchemy compatibility (e.g. from postgres:// to postgresql://)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Setup engine arguments. If SQLite is used, disable same thread check.
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Synchronous Engine Setup
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get db session in routers (fallback/synchronous)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Asynchronous Engine Setup
ASYNC_DATABASE_URL = DATABASE_URL
if ASYNC_DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif ASYNC_DATABASE_URL.startswith("sqlite://"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)

async_engine = create_async_engine(ASYNC_DATABASE_URL, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# Dependency to get async db session in routers
async def get_async_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()
