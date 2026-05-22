import type { Profile, PortfolioItem, Proposal, ProposalListItem } from './types';

const API_URL = import.meta.env.VITE_API_URL;
const BASE = API_URL ? `${API_URL}/api` : (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Profile
export const getProfile = () => request<Profile>('/profile');
export const updateProfile = (data: { bio: string; skills: string[] }) =>
  request<Profile>('/profile', { method: 'PUT', body: JSON.stringify(data) });

// Portfolio
export const getPortfolio = () => request<PortfolioItem[]>('/portfolio');
export const createPortfolioItem = (data: Omit<PortfolioItem, 'id' | 'created_at'>) =>
  request<PortfolioItem>('/portfolio', { method: 'POST', body: JSON.stringify(data) });
export const updatePortfolioItem = (id: number, data: Omit<PortfolioItem, 'id' | 'created_at'>) =>
  request<PortfolioItem>(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePortfolioItem = (id: number) =>
  request<void>(`/portfolio/${id}`, { method: 'DELETE' });

// Proposals
export const generateProposal = (job_text: string) =>
  request<Proposal>('/proposals/generate', { method: 'POST', body: JSON.stringify({ job_text }) });
export const getProposals = () => request<ProposalListItem[]>('/proposals');
export const getProposal = (id: number) => request<Proposal>(`/proposals/${id}`);
export const updateProposal = (id: number, proposal_text: string) =>
  request<Proposal>(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify({ proposal_text }) });
