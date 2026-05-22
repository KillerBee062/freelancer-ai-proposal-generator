"""
Database module for the AI Proposal Generator.

Connection is configured via the DATABASE_URL environment variable.
Supports:
  - Local dev:    sqlite:///app.db           (default)
  - Turso prod:   libsql://your-db.turso.io?authToken=…
  - Postgres:     postgresql://user:pass@host/db

Uses SQLAlchemy Core so the rest of the app stays driver-agnostic.
"""

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import (
    Column,
    Integer,
    Text,
    ForeignKey,
    CheckConstraint,
    create_engine,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Load .env from the project root (one level up from backend/)
_dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_dotenv_path)

_DEFAULT_DB_URL = "sqlite:///app.db"

Base = declarative_base()


# ---------------------------------------------------------------------------
# ORM Models (table definitions)
# ---------------------------------------------------------------------------

class ProfileRow(Base):
    __tablename__ = "profile"
    id = Column(Integer, primary_key=True)
    bio = Column(Text)
    skills = Column(Text)  # JSON array string
    updated_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))
    __table_args__ = (CheckConstraint("id = 1"),)


class PortfolioItemRow(Base):
    __tablename__ = "portfolio_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(Text, nullable=False)
    description = Column(Text)
    url = Column(Text)
    tags = Column(Text)  # JSON array string
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))


class JobRow(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_text = Column(Text, nullable=False)
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))


class ProposalRow(Base):
    __tablename__ = "proposals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    proposal_text = Column(Text)
    attachments = Column(Text)  # JSON string
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))


# ---------------------------------------------------------------------------
# Engine & session management
# ---------------------------------------------------------------------------

def get_database_url() -> str:
    """Return the DATABASE_URL from the environment (or the default)."""
    return os.getenv("DATABASE_URL", _DEFAULT_DB_URL)


def _make_connect_args(url: str) -> dict:
    """Build extra connect_args depending on the backend."""
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


_engine = None
_SessionLocal = None


def get_engine():
    """Lazily create and return the SQLAlchemy engine (singleton)."""
    global _engine
    if _engine is None:
        url = get_database_url()
        _engine = create_engine(
            url,
            connect_args=_make_connect_args(url),
            echo=False,
        )
    return _engine


def init_db() -> None:
    """Create all tables if they do not already exist."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


def _get_session_factory() -> sessionmaker:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False)
    return _SessionLocal


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session and close it when done."""
    factory = _get_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()
