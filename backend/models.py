"""
Pydantic models for request/response validation in the AI Proposal Generator API.
"""

from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    bio: str
    skills: list[str]


class ProfileResponse(BaseModel):
    id: int
    bio: str
    skills: list[str]
    updated_at: str


class PortfolioItemCreate(BaseModel):
    title: str
    description: str = ""
    url: str = ""
    tags: list[str] = []


class PortfolioItemResponse(BaseModel):
    id: int
    title: str
    description: str
    url: str
    tags: list[str]
    created_at: str


class GenerateRequest(BaseModel):
    job_text: str


class AttachmentInfo(BaseModel):
    portfolio_item_id: int
    title: str
    rationale: str
    rank: int


class ProposalResponse(BaseModel):
    id: int
    job_id: int
    job_text: str
    proposal_text: str
    attachments: list[AttachmentInfo]
    created_at: str


class ProposalListItem(BaseModel):
    id: int
    job_text_snippet: str
    proposal_text_snippet: str
    created_at: str


class ProposalUpdate(BaseModel):
    proposal_text: str
