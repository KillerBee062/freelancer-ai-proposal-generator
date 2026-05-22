"""
Database seeder for the AI Proposal Generator.
Loads seed_data.json and populates the database with initial data if empty.
"""

import json
from pathlib import Path

from sqlalchemy import text

from database import get_session


def seed_database() -> None:
    """
    Seed the database with initial profile, portfolio items, job, and proposal.
    Skips seeding if profile data already exists.
    """
    with get_session() as session:
        # Check if profile already exists
        row = session.execute(text("SELECT COUNT(*) AS cnt FROM profile")).mappings().first()
        if row and row["cnt"] > 0:
            print("[Seed] Database already seeded. Skipping.")
            return

        # Load seed data
        seed_path = Path(__file__).resolve().parent / "seed_data.json"
        with open(seed_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        try:
            # Insert profile
            profile = data["profile"]
            session.execute(
                text("INSERT INTO profile (id, bio, skills) VALUES (1, :bio, :skills)"),
                {"bio": profile["bio"], "skills": json.dumps(profile["skills"])},
            )

            # Insert portfolio items and track their IDs
            portfolio_id_map: dict[int, int] = {}  # seed index (1-based) -> actual DB id
            for idx, item in enumerate(data["portfolio_items"], start=1):
                result = session.execute(
                    text(
                        "INSERT INTO portfolio_items (title, description, url, tags) "
                        "VALUES (:title, :desc, :url, :tags)"
                    ),
                    {
                        "title": item["title"],
                        "desc": item.get("description", ""),
                        "url": item.get("url", ""),
                        "tags": json.dumps(item.get("tags", [])),
                    },
                )
                portfolio_id_map[idx] = result.lastrowid

            # Insert sample job
            sample_job = data["sample_job"]
            job_result = session.execute(
                text("INSERT INTO jobs (raw_text) VALUES (:raw_text)"),
                {"raw_text": sample_job["raw_text"]},
            )
            job_id = job_result.lastrowid

            # Build attachments with actual DB IDs
            sample_proposal = data["sample_proposal"]
            attachments = []
            for att in sample_proposal["attachments"]:
                seed_id = att["portfolio_item_id"]
                actual_id = portfolio_id_map.get(seed_id, seed_id)
                attachments.append(
                    {
                        "portfolio_item_id": actual_id,
                        "rationale": att["rationale"],
                        "rank": att["rank"],
                    }
                )

            # Insert sample proposal
            session.execute(
                text(
                    "INSERT INTO proposals (job_id, proposal_text, attachments) "
                    "VALUES (:job_id, :text, :att)"
                ),
                {
                    "job_id": job_id,
                    "text": sample_proposal["proposal_text"],
                    "att": json.dumps(attachments),
                },
            )

            session.commit()
            print("[Seed] Database seeded successfully.")

        except Exception as e:
            session.rollback()
            print(f"[Seed] Error seeding database: {e}")
            raise
