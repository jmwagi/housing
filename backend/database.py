"""
  =====================================================
  database.py — Database Engine & Session Setup
  =====================================================
  Supports both SQLite (local dev) and PostgreSQL (production/Render).
  The database URL comes from the DATABASE_URL environment variable.
  On Render, this is set automatically when you attach a PostgreSQL DB.
  Locally, it falls back to SQLite so you don't need to install Postgres.

  SWITCHING LOGIC:
  1. Check for DATABASE_URL environment variable (set by Render or manually)
  2. If it's a postgresql:// URL (Render style), add +asyncpg for async support
  3. If no env var, use SQLite for local development
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

# Read DATABASE_URL from environment (Render sets this automatically
# when you create a PostgreSQL database and attach it to your service).
# If not set, fall back to SQLite for local development.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render provides postgresql:// but SQLAlchemy async needs postgresql+asyncpg://
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    # Local fallback — file-based SQLite
    DATABASE_URL = "sqlite+aiosqlite:///./backend/keja-go.db"

# Create the async engine
engine = create_async_engine(DATABASE_URL, echo=False)

# Create a session factory
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    from backend.models import Listing, Area, User, Favorite
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Migration: add columns that may be missing on existing production databases
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        async with engine.begin() as conn:
            migrations = [
                "ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
                "ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
                "ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)",
                "ALTER TABLE listings ADD COLUMN IF NOT EXISTS amenities TEXT DEFAULT ''",
                "ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
                "ALTER TABLE areas ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
                "ALTER TABLE areas ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(50)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
            ]
            for stmt in migrations:
                try:
                    await conn.execute(text(stmt))
                except Exception:
                    pass  # Column may already exist or other transient issue
