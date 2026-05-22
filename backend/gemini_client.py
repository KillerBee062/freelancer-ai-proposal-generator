"""
Gemini AI client for generating freelance proposals.
Uses the google-genai SDK with gemini-2.5-flash model.
"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load .env from the project root (one level up from backend/)
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path)


def _build_system_prompt(profile: dict, portfolio_items: list[dict]) -> str:
    """Build a detailed system prompt with the freelancer's profile and portfolio."""
    skills_str = ", ".join(profile.get("skills", []))

    portfolio_section = ""
    for item in portfolio_items:
        tags = ", ".join(item.get("tags", []))
        portfolio_section += (
            f"  - ID: {item['id']} | Title: \"{item['title']}\" | "
            f"Description: \"{item.get('description', '')}\" | Tags: [{tags}]\n"
        )

    return f"""You are an expert freelance proposal writer. Your job is to craft a winning proposal 
for a freelancer applying to a job posting.

## FREELANCER PROFILE
- Bio: {profile.get('bio', 'Not provided')}
- Skills: [{skills_str}]

## PORTFOLIO ITEMS (use ONLY these IDs when selecting attachments)
{portfolio_section}

## INSTRUCTIONS
1. Write a professional, warm, and personalized proposal that DIRECTLY addresses the specific 
   requirements mentioned in the job posting. Do not be generic — reference what the client is 
   asking for and explain why this freelancer is the right fit.
2. Reference specific skills from the freelancer's profile that match the job requirements. 
   Show concrete experience, not just buzzwords.
3. Keep the proposal concise: 3-5 paragraphs. Open with enthusiasm for the specific project, 
   demonstrate relevant experience in the middle, and close with a call to action.
4. Select the 2-4 MOST RELEVANT portfolio items from the provided list above. Only include 
   items that genuinely relate to the job requirements. If fewer than 2 are relevant, include 
   only the relevant ones.
5. Rank the selected portfolio items by relevance (rank 1 = most relevant) and provide a 
   concise one-line rationale explaining why each item is relevant to THIS specific job.
6. Return ONLY portfolio items from the list above, using their EXACT integer IDs.

## OUTPUT FORMAT
Return a JSON object with exactly two keys:
- "proposal_text": A string containing the full proposal text.
- "attachments": An array of objects, each with:
  - "portfolio_item_id": integer (must match an ID from the portfolio list above)
  - "rationale": string (one-line explanation of relevance)
  - "rank": integer (1 = most relevant)

Do NOT include any text outside the JSON object."""


def _build_response_schema() -> dict:
    """Define the JSON schema for Gemini's structured response."""
    return {
        "type": "object",
        "properties": {
            "proposal_text": {
                "type": "string",
                "description": "The full proposal text",
            },
            "attachments": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "portfolio_item_id": {
                            "type": "integer",
                            "description": "ID of the portfolio item",
                        },
                        "rationale": {
                            "type": "string",
                            "description": "One-line rationale for relevance",
                        },
                        "rank": {
                            "type": "integer",
                            "description": "Relevance ranking (1 = most relevant)",
                        },
                    },
                    "required": ["portfolio_item_id", "rationale", "rank"],
                },
            },
        },
        "required": ["proposal_text", "attachments"],
    }


def _sync_generate(
    profile: dict, portfolio_items: list[dict], job_text: str
) -> dict:
    """Synchronous Gemini API call (to be run in a thread)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    client = genai.Client(api_key=api_key)

    system_prompt = _build_system_prompt(profile, portfolio_items)
    response_schema = _build_response_schema()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Write a proposal for this job posting:\n\n{job_text}",
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=response_schema,
        ),
    )

    result = json.loads(response.text)
    return result


async def generate_proposal(
    profile: dict, portfolio_items: list[dict], job_text: str
) -> dict:
    """
    Generate a freelance proposal using Gemini AI.

    Args:
        profile: Dict with 'bio' and 'skills' keys.
        portfolio_items: List of dicts with 'id', 'title', 'description', 'tags' keys.
        job_text: The raw job posting text.

    Returns:
        Dict with 'proposal_text' (str) and 'attachments' (list of dicts).
    """
    try:
        result = await asyncio.to_thread(
            _sync_generate, profile, portfolio_items, job_text
        )

        # Validate the response structure
        if "proposal_text" not in result:
            raise ValueError("Missing 'proposal_text' in Gemini response")
        if "attachments" not in result:
            result["attachments"] = []

        # Filter attachments to only valid portfolio item IDs
        valid_ids = {item["id"] for item in portfolio_items}
        result["attachments"] = [
            att
            for att in result["attachments"]
            if att.get("portfolio_item_id") in valid_ids
        ]

        return result

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"[Gemini Error] {error_msg}")
        # Return a fallback response
        return {
            "proposal_text": (
                f"⚠️ **AI Generation Failed**\n\n"
                f"An error occurred while communicating with the Gemini API:\n\n`{error_msg}`\n\n"
                f"**How to fix:**\n"
                f"1. Make sure you have added `GEMINI_API_KEY` to your Vercel Project Settings -> Environment Variables.\n"
                f"2. Make sure you hit 'Redeploy' after adding the variable.\n"
                f"3. Check that your API key is valid and has billing/quota available."
            ),
            "attachments": []
        }
