"""
FastAPI application for the AI Proposal Generator.
Provides REST API endpoints for managing profiles, portfolio items, and AI-generated proposals.
"""

import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import get_session, init_db
from gemini_client import generate_proposal
from models import (
    AttachmentInfo,
    GenerateRequest,
    PortfolioItemCreate,
    PortfolioItemResponse,
    ProfileResponse,
    ProfileUpdate,
    ProposalListItem,
    ProposalResponse,
    ProposalUpdate,
)
from seed import seed_database


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    init_db()
    seed_database()
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Proposal Generator API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — read allowed origin from env; fall back to Vite dev server
_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/healthz")
async def healthz():
    """Health check endpoint for Render / load-balancer probes."""
    return {"status": "ok"}


# ===========================================================================
# Profile endpoints
# ===========================================================================

@app.get("/api/profile", response_model=ProfileResponse)
async def get_profile():
    """Return the freelancer profile (single-row table, id=1)."""
    with get_session() as session:
        row = session.execute(text("SELECT * FROM profile WHERE id = 1")).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        return ProfileResponse(
            id=row["id"],
            bio=row["bio"] or "",
            skills=json.loads(row["skills"]) if row["skills"] else [],
            updated_at=row["updated_at"] or "",
        )


@app.put("/api/profile", response_model=ProfileResponse)
async def upsert_profile(profile: ProfileUpdate):
    """Create or update the freelancer profile."""
    with get_session() as session:
        session.execute(
            text(
                "INSERT OR REPLACE INTO profile (id, bio, skills, updated_at) "
                "VALUES (1, :bio, :skills, CURRENT_TIMESTAMP)"
            ),
            {"bio": profile.bio, "skills": json.dumps(profile.skills)},
        )
        session.commit()

        row = session.execute(text("SELECT * FROM profile WHERE id = 1")).mappings().first()
        return ProfileResponse(
            id=row["id"],
            bio=row["bio"] or "",
            skills=json.loads(row["skills"]) if row["skills"] else [],
            updated_at=row["updated_at"] or "",
        )


# ===========================================================================
# Portfolio endpoints
# ===========================================================================

@app.get("/api/portfolio", response_model=list[PortfolioItemResponse])
async def list_portfolio():
    """List all portfolio items."""
    with get_session() as session:
        rows = session.execute(
            text("SELECT * FROM portfolio_items ORDER BY created_at DESC")
        ).mappings().all()
        return [
            PortfolioItemResponse(
                id=row["id"],
                title=row["title"],
                description=row["description"] or "",
                url=row["url"] or "",
                tags=json.loads(row["tags"]) if row["tags"] else [],
                created_at=row["created_at"] or "",
            )
            for row in rows
        ]


@app.post("/api/portfolio", response_model=PortfolioItemResponse, status_code=201)
async def create_portfolio_item(item: PortfolioItemCreate):
    """Create a new portfolio item."""
    with get_session() as session:
        result = session.execute(
            text(
                "INSERT INTO portfolio_items (title, description, url, tags) "
                "VALUES (:title, :desc, :url, :tags)"
            ),
            {
                "title": item.title,
                "desc": item.description,
                "url": item.url,
                "tags": json.dumps(item.tags),
            },
        )
        session.commit()
        item_id = result.lastrowid

        row = session.execute(
            text("SELECT * FROM portfolio_items WHERE id = :id"), {"id": item_id}
        ).mappings().first()
        return PortfolioItemResponse(
            id=row["id"],
            title=row["title"],
            description=row["description"] or "",
            url=row["url"] or "",
            tags=json.loads(row["tags"]) if row["tags"] else [],
            created_at=row["created_at"] or "",
        )


@app.put("/api/portfolio/{item_id}", response_model=PortfolioItemResponse)
async def update_portfolio_item(item_id: int, item: PortfolioItemCreate):
    """Update an existing portfolio item."""
    with get_session() as session:
        existing = session.execute(
            text("SELECT id FROM portfolio_items WHERE id = :id"), {"id": item_id}
        ).mappings().first()
        if not existing:
            raise HTTPException(status_code=404, detail="Portfolio item not found")

        session.execute(
            text(
                "UPDATE portfolio_items SET title = :title, description = :desc, "
                "url = :url, tags = :tags WHERE id = :id"
            ),
            {
                "title": item.title,
                "desc": item.description,
                "url": item.url,
                "tags": json.dumps(item.tags),
                "id": item_id,
            },
        )
        session.commit()

        row = session.execute(
            text("SELECT * FROM portfolio_items WHERE id = :id"), {"id": item_id}
        ).mappings().first()
        return PortfolioItemResponse(
            id=row["id"],
            title=row["title"],
            description=row["description"] or "",
            url=row["url"] or "",
            tags=json.loads(row["tags"]) if row["tags"] else [],
            created_at=row["created_at"] or "",
        )


@app.delete("/api/portfolio/{item_id}", status_code=204)
async def delete_portfolio_item(item_id: int):
    """Delete a portfolio item."""
    with get_session() as session:
        existing = session.execute(
            text("SELECT id FROM portfolio_items WHERE id = :id"), {"id": item_id}
        ).mappings().first()
        if not existing:
            raise HTTPException(status_code=404, detail="Portfolio item not found")

        session.execute(
            text("DELETE FROM portfolio_items WHERE id = :id"), {"id": item_id}
        )
        session.commit()


# ===========================================================================
# Proposal endpoints
# ===========================================================================

@app.post("/api/proposals/generate", response_model=ProposalResponse)
async def generate_proposal_endpoint(request: GenerateRequest):
    """Generate a proposal for a job posting using Gemini AI."""
    with get_session() as session:
        # Fetch profile
        profile_row = session.execute(
            text("SELECT * FROM profile WHERE id = 1")
        ).mappings().first()
        if not profile_row:
            raise HTTPException(
                status_code=400,
                detail="Profile not found. Please create your profile first.",
            )
        profile = {
            "bio": profile_row["bio"] or "",
            "skills": json.loads(profile_row["skills"]) if profile_row["skills"] else [],
        }

        # Fetch portfolio items
        portfolio_rows = session.execute(
            text("SELECT * FROM portfolio_items ORDER BY id")
        ).mappings().all()
        portfolio_items = [
            {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"] or "",
                "url": row["url"] or "",
                "tags": json.loads(row["tags"]) if row["tags"] else [],
            }
            for row in portfolio_rows
        ]

        # Insert job
        job_result = session.execute(
            text("INSERT INTO jobs (raw_text) VALUES (:raw_text)"),
            {"raw_text": request.job_text},
        )
        session.commit()
        job_id = job_result.lastrowid

        # Generate proposal via Gemini
        result = await generate_proposal(profile, portfolio_items, request.job_text)

        proposal_text = result.get("proposal_text", "")
        attachments = result.get("attachments", [])

        # Save proposal
        proposal_result = session.execute(
            text(
                "INSERT INTO proposals (job_id, proposal_text, attachments) "
                "VALUES (:job_id, :text, :att)"
            ),
            {
                "job_id": job_id,
                "text": proposal_text,
                "att": json.dumps(attachments),
            },
        )
        session.commit()
        proposal_id = proposal_result.lastrowid

        # Build attachment info with titles from portfolio
        portfolio_map = {item["id"]: item["title"] for item in portfolio_items}
        attachment_infos = [
            AttachmentInfo(
                portfolio_item_id=att["portfolio_item_id"],
                title=portfolio_map.get(att["portfolio_item_id"], "Unknown"),
                rationale=att.get("rationale", ""),
                rank=att.get("rank", 0),
            )
            for att in attachments
        ]

        created_at = _get_proposal_created_at(session, proposal_id)

        return ProposalResponse(
            id=proposal_id,
            job_id=job_id,
            job_text=request.job_text,
            proposal_text=proposal_text,
            attachments=attachment_infos,
            created_at=created_at,
        )


@app.get("/api/proposals", response_model=list[ProposalListItem])
async def list_proposals():
    """List all proposals with snippets."""
    with get_session() as session:
        rows = session.execute(
            text(
                "SELECT p.id, p.proposal_text, p.created_at, j.raw_text AS job_text "
                "FROM proposals p "
                "JOIN jobs j ON p.job_id = j.id "
                "ORDER BY p.created_at DESC"
            )
        ).mappings().all()
        return [
            ProposalListItem(
                id=row["id"],
                job_text_snippet=_snippet(row["job_text"], 120),
                proposal_text_snippet=_snippet(row["proposal_text"], 120),
                created_at=row["created_at"] or "",
            )
            for row in rows
        ]


@app.get("/api/proposals/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: int):
    """Get full proposal details including job text and attachments with titles."""
    with get_session() as session:
        row = session.execute(
            text(
                "SELECT p.id, p.job_id, p.proposal_text, p.attachments, p.created_at, "
                "j.raw_text AS job_text "
                "FROM proposals p "
                "JOIN jobs j ON p.job_id = j.id "
                "WHERE p.id = :id"
            ),
            {"id": proposal_id},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Proposal not found")

        raw_attachments = json.loads(row["attachments"]) if row["attachments"] else []
        attachment_infos = _enrich_attachments(session, raw_attachments)

        return ProposalResponse(
            id=row["id"],
            job_id=row["job_id"],
            job_text=row["job_text"] or "",
            proposal_text=row["proposal_text"] or "",
            attachments=attachment_infos,
            created_at=row["created_at"] or "",
        )


@app.put("/api/proposals/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(proposal_id: int, update: ProposalUpdate):
    """Update the proposal text only."""
    with get_session() as session:
        existing = session.execute(
            text("SELECT id FROM proposals WHERE id = :id"), {"id": proposal_id}
        ).mappings().first()
        if not existing:
            raise HTTPException(status_code=404, detail="Proposal not found")

        session.execute(
            text("UPDATE proposals SET proposal_text = :text WHERE id = :id"),
            {"text": update.proposal_text, "id": proposal_id},
        )
        session.commit()

        row = session.execute(
            text(
                "SELECT p.id, p.job_id, p.proposal_text, p.attachments, p.created_at, "
                "j.raw_text AS job_text "
                "FROM proposals p "
                "JOIN jobs j ON p.job_id = j.id "
                "WHERE p.id = :id"
            ),
            {"id": proposal_id},
        ).mappings().first()

        raw_attachments = json.loads(row["attachments"]) if row["attachments"] else []
        attachment_infos = _enrich_attachments(session, raw_attachments)

        return ProposalResponse(
            id=row["id"],
            job_id=row["job_id"],
            job_text=row["job_text"] or "",
            proposal_text=row["proposal_text"] or "",
            attachments=attachment_infos,
            created_at=row["created_at"] or "",
        )


# ===========================================================================
# Helpers
# ===========================================================================

def _snippet(txt: str | None, length: int = 120) -> str:
    """Create a text snippet, truncating with '...' if needed."""
    if not txt:
        return ""
    if len(txt) <= length:
        return txt
    return txt[:length] + "..."


def _enrich_attachments(session, raw_attachments: list[dict]) -> list[AttachmentInfo]:
    """Look up portfolio item titles and build AttachmentInfo list."""
    if not raw_attachments:
        return []

    ids = [att.get("portfolio_item_id") for att in raw_attachments if att.get("portfolio_item_id")]
    if not ids:
        return []

    # Build a safe IN clause with named params
    params = {f"id_{i}": v for i, v in enumerate(ids)}
    placeholders = ", ".join(f":id_{i}" for i in range(len(ids)))
    rows = session.execute(
        text(f"SELECT id, title FROM portfolio_items WHERE id IN ({placeholders})"),
        params,
    ).mappings().all()
    title_map = {row["id"]: row["title"] for row in rows}

    return [
        AttachmentInfo(
            portfolio_item_id=att["portfolio_item_id"],
            title=title_map.get(att["portfolio_item_id"], "Unknown"),
            rationale=att.get("rationale", ""),
            rank=att.get("rank", 0),
        )
        for att in raw_attachments
    ]


def _get_proposal_created_at(session, proposal_id: int) -> str:
    """Fetch the created_at timestamp for a proposal."""
    row = session.execute(
        text("SELECT created_at FROM proposals WHERE id = :id"), {"id": proposal_id}
    ).mappings().first()
    return row["created_at"] if row else ""
