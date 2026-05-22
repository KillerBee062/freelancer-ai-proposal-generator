import { useState } from 'react';
import type { Proposal } from '../types';
import * as api from '../api';

export default function NewProposalPage() {
  const [jobText, setJobText] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!jobText.trim()) return;
    setLoading(true);
    setError('');
    setProposal(null);
    try {
      const result = await api.generateProposal(jobText);
      setProposal(result);
      setEditedText(result.proposal_text);
    } catch {
      setError('Failed to generate proposal. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!proposal) return;
    setSaving(true);
    try {
      const updated = await api.updateProposal(proposal.id, editedText);
      setProposal(updated);
    } catch {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── INPUT VIEW ─── */
  if (!proposal) {
    return (
      <div className="space-y-8">
        <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
          New Proposal
        </h1>

        <div className="glass glow-border rounded-2xl p-6">
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Job Post
          </label>
          <textarea
            rows={10}
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the job post here…"
            className="w-full resize-none rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm leading-relaxed text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !jobText.trim()}
            className={`mt-6 rounded-xl bg-gradient-to-r from-accent to-purple-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-accent-light hover:to-purple-400 hover:shadow-accent/25 disabled:opacity-50 ${
              loading ? 'animate-pulse-glow' : ''
            }`}
          >
            {loading ? '✨ Generating…' : '✨ Generate Proposal'}
          </button>
        </div>
      </div>
    );
  }

  /* ─── RESULT VIEW ─── */
  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
          Generated Proposal
        </h1>
        <button
          onClick={() => {
            setProposal(null);
            setJobText('');
            setEditedText('');
          }}
          className="rounded-xl border border-surface-lighter px-5 py-2.5 text-sm text-slate-400 transition-all hover:bg-surface-light hover:text-slate-200"
        >
          ← New Proposal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Proposal text (2/3) ── */}
        <div className="glass glow-border relative rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Proposal</h2>
            <button
              onClick={handleCopy}
              className="rounded-lg border border-surface-lighter px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-accent hover:text-accent-light"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          <textarea
            rows={18}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full resize-none rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm leading-relaxed text-slate-200 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-xl bg-gradient-to-r from-accent to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-accent-light hover:to-purple-400 hover:shadow-accent/25 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* ── Attachments sidebar (1/3) ── */}
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Suggested Attachments
          </h2>

          {proposal.attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments suggested.</p>
          ) : (
            <div className="space-y-4">
              {proposal.attachments
                .sort((a, b) => a.rank - b.rank)
                .map((att) => (
                  <div
                    key={att.portfolio_item_id}
                    className="animate-fade-in rounded-xl border border-surface-lighter bg-surface-light/50 p-4 transition-all hover:border-accent/30"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-light">
                        {att.rank}
                      </span>
                      <h3 className="text-sm font-semibold text-white">
                        {att.title}
                      </h3>
                    </div>
                    <p className="text-xs italic text-slate-400">
                      {att.rationale}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
