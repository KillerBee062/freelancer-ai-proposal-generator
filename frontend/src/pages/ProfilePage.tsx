import { useState, useEffect, useCallback } from 'react';
import type { Profile, PortfolioItem } from '../types';
import * as api from '../api';

/* ───────────────── tiny status toast ───────────────── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`animate-fade-in fixed right-8 top-8 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
        type === 'success'
          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
      }`}
    >
      {message}
    </div>
  );
}

/* ───────────────── portfolio form (inline) ───────────────── */
interface PortfolioFormProps {
  initial?: PortfolioItem;
  onSave: (data: Omit<PortfolioItem, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

function PortfolioForm({ initial, onSave, onCancel }: PortfolioFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(', ') ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await onSave({ title, description, url, tags });
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass animate-fade-in col-span-full space-y-4 rounded-2xl p-6"
    >
      <h3 className="text-lg font-semibold text-white">
        {initial ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      </h3>

      <input
        required
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <textarea
        required
        rows={3}
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full resize-none rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <input
        placeholder="URL (optional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <input
        placeholder="Tags (comma-separated)"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        className="w-full rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-accent to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-accent-light hover:to-purple-400 hover:shadow-accent/25 disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-surface-lighter px-6 py-2.5 text-sm text-slate-400 transition-all hover:bg-surface-light hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ───────────────── portfolio card ───────────────── */
interface CardProps {
  item: PortfolioItem;
  onEdit: () => void;
  onDelete: () => void;
}

function PortfolioCard({ item, onEdit, onDelete }: CardProps) {
  return (
    <div className="glass group animate-fade-in rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/10">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-surface-lighter hover:text-white"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-slate-400">{item.description}</p>

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-block text-sm text-accent-light transition-colors hover:text-glow"
        >
          {item.url} ↗
        </a>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/20 px-2 py-1 text-xs text-accent-light"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────── main page ───────────────── */
export default function ProfilePage() {
  const [, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const flash = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  /* load data */
  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p);
      setBio(p.bio);
      setSkills(p.skills);
    }).catch(() => {
      // API not available, work with empty state
    });
    api.getPortfolio().then(setPortfolio).catch(() => {});
  }, []);

  /* save profile */
  const saveProfile = async () => {
    try {
      const updated = await api.updateProfile({ bio, skills });
      setProfile(updated);
      flash('Profile saved');
    } catch {
      flash('Failed to save profile', 'error');
    }
  };

  /* skills */
  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setNewSkill('');
    }
  };
  const removeSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill));

  /* portfolio CRUD */
  const handleAddPortfolio = async (data: Omit<PortfolioItem, 'id' | 'created_at'>) => {
    try {
      const item = await api.createPortfolioItem(data);
      setPortfolio((prev) => [...prev, item]);
      setShowForm(false);
      flash('Portfolio item added');
    } catch {
      flash('Failed to add item', 'error');
    }
  };

  const handleUpdatePortfolio = async (data: Omit<PortfolioItem, 'id' | 'created_at'>) => {
    if (!editingItem) return;
    try {
      const item = await api.updatePortfolioItem(editingItem.id, data);
      setPortfolio((prev) => prev.map((p) => (p.id === item.id ? item : p)));
      setEditingItem(null);
      flash('Portfolio item updated');
    } catch {
      flash('Failed to update item', 'error');
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    try {
      await api.deletePortfolioItem(id);
      setPortfolio((prev) => prev.filter((p) => p.id !== id));
      flash('Portfolio item deleted');
    } catch {
      flash('Failed to delete item', 'error');
    }
  };

  return (
    <div className="space-y-10">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ─── Page title ─── */}
      <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
        Your Profile
      </h1>

      {/* ─── Bio ─── */}
      <section className="glass glow-border rounded-2xl p-6">
        <label className="mb-2 block text-sm font-medium text-slate-400">Bio</label>
        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell clients about yourself…"
          className="w-full resize-none rounded-xl border border-surface-lighter bg-surface-light px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={saveProfile}
          className="mt-4 rounded-xl bg-gradient-to-r from-accent to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-accent-light hover:to-purple-400 hover:shadow-accent/25"
        >
          Save Profile
        </button>
      </section>

      {/* ─── Skills ─── */}
      <section className="glass glow-border rounded-2xl p-6">
        <label className="mb-4 block text-sm font-medium text-slate-400">Skills</label>

        <div className="mb-4 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent-light"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="ml-0.5 text-accent-light/60 transition-colors hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
          {skills.length === 0 && (
            <span className="text-sm text-slate-500">No skills added yet</span>
          )}
        </div>

        <div className="flex gap-3">
          <input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            placeholder="Add a skill…"
            className="flex-1 rounded-xl border border-surface-lighter bg-surface-light px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={addSkill}
            className="rounded-xl bg-gradient-to-r from-accent to-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:from-accent-light hover:to-purple-400"
          >
            Add
          </button>
        </div>
      </section>

      {/* ─── Portfolio ─── */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-bold text-transparent">
            Portfolio
          </h2>
          {!showForm && !editingItem && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-gradient-to-r from-accent to-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:from-accent-light hover:to-purple-400"
            >
              + Add Item
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {showForm && (
            <PortfolioForm onSave={handleAddPortfolio} onCancel={() => setShowForm(false)} />
          )}

          {editingItem && (
            <PortfolioForm
              initial={editingItem}
              onSave={handleUpdatePortfolio}
              onCancel={() => setEditingItem(null)}
            />
          )}

          {portfolio.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              onEdit={() => {
                setShowForm(false);
                setEditingItem(item);
              }}
              onDelete={() => handleDeletePortfolio(item.id)}
            />
          ))}

          {portfolio.length === 0 && !showForm && (
            <div className="col-span-full py-12 text-center text-slate-500">
              <p className="mb-2 text-4xl">🎨</p>
              <p>No portfolio items yet. Add your first project!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
