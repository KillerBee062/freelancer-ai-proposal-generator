import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Proposal, ProposalListItem } from '../types';
import * as api from '../api';

/* ────────── helpers ────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ────────── detail view ────────── */
function ProposalDetail({ id }: { id: number }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editedText, setEditedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getProposal(id)
      .then((p) => {
        setProposal(p);
        setEditedText(p.proposal_text);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!proposal) {
    return <p className="py-12 text-center text-slate-500">Proposal not found.</p>;
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
          Proposal Detail
        </h1>
        <Link
          to="/history"
          className="rounded-xl border border-surface-lighter px-5 py-2.5 text-sm text-slate-400 transition-all hover:bg-surface-light hover:text-slate-200"
        >
          ← Back to History
        </Link>
      </div>

      {/* Job text snippet */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          Original Job Post
        </h3>
        <p className="text-sm leading-relaxed text-slate-300">{proposal.job_text}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Proposal editor */}
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
            rows={16}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full resize-none rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm leading-relaxed text-slate-200 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-xl bg-gradient-to-r from-accent to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-accent-light hover:to-purple-400 hover:shadow-accent/25 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Attachments */}
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Suggested Attachments
          </h2>

          {proposal.attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments.</p>
          ) : (
            <div className="space-y-4">
              {proposal.attachments
                .sort((a, b) => a.rank - b.rank)
                .map((att) => (
                  <div
                    key={att.portfolio_item_id}
                    className="rounded-xl border border-surface-lighter bg-surface-light/50 p-4 transition-all hover:border-accent/30"
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

/* ────────── list view ────────── */
function ProposalList() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProposals()
      .then((data) => setProposals(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-3 text-5xl">📝</p>
        <p className="mb-4 text-lg text-slate-400">No proposals yet</p>
        <Link
          to="/new"
          className="inline-block rounded-xl bg-gradient-to-r from-accent to-purple-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:from-accent-light hover:to-purple-400"
        >
          Create your first proposal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((p) => (
        <Link
          key={p.id}
          to={`/history/${p.id}`}
          className="glass group block rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-accent/10"
        >
          <div className="mb-2 flex items-start justify-between">
            <h3 className="line-clamp-1 text-base font-semibold text-white group-hover:text-accent-light">
              {p.job_text_snippet}
            </h3>
            <span className="ml-4 shrink-0 text-xs text-slate-500">
              {formatDate(p.created_at)}
            </span>
          </div>
          <p className="line-clamp-2 text-sm text-slate-400">
            {p.proposal_text_snippet}
          </p>
        </Link>
      ))}
    </div>
  );
}

/* ────────── page component ────────── */
export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-8">
      {id ? (
        <ProposalDetail id={Number(id)} />
      ) : (
        <>
          <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
            Proposal History
          </h1>
          <ProposalList />
        </>
      )}
    </div>
  );
}
