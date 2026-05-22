export interface Profile {
  id: number;
  bio: string;
  skills: string[];
  updated_at: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  url: string;
  tags: string[];
  created_at: string;
}

export interface AttachmentInfo {
  portfolio_item_id: number;
  title: string;
  rationale: string;
  rank: number;
}

export interface Proposal {
  id: number;
  job_id: number;
  job_text: string;
  proposal_text: string;
  attachments: AttachmentInfo[];
  created_at: string;
}

export interface ProposalListItem {
  id: number;
  job_text_snippet: string;
  proposal_text_snippet: string;
  created_at: string;
}
