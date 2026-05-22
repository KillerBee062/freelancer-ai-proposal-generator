# ProposalAI — AI Proposal Generator for Freelancers

Generate tailored job proposals in seconds using AI. Paste a job post, get a professional proposal with relevant portfolio attachments ranked by relevance.

![Stack](https://img.shields.io/badge/React-Vite-blue) ![Stack](https://img.shields.io/badge/FastAPI-Python-green) ![Stack](https://img.shields.io/badge/Gemini-AI-purple)

## Features

- **Profile Editor** — Manage your bio, skills, and portfolio items
- **AI Proposal Generation** — Paste a job post, get a tailored proposal in ~15 seconds
- **Smart Attachments** — AI selects and ranks your most relevant portfolio items with rationales
- **Inline Editing** — Edit generated proposals before sending
- **One-Click Copy** — Copy proposals to clipboard instantly
- **History** — Revisit and edit past proposals

## Quick Start (Local Dev)

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Gemini API Key** — Get one free at [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. On first run, seed data (sample profile, 3 portfolio items, and 1 example proposal) is loaded automatically.

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

---

## Deploy for Free

Ship to production with **Vercel** (frontend) + **Render** (backend) + **Turso** (database) — all free tiers.

### Step 1 — Turso Database

1. Install the Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
2. Sign up / log in:
   ```bash
   turso auth signup   # or: turso auth login
   ```
3. Create a database:
   ```bash
   turso db create proposalai
   ```
4. Get your connection URL:
   ```bash
   turso db show proposalai --url
   # Output: libsql://proposalai-<your-username>.turso.io
   ```
5. Create an auth token:
   ```bash
   turso db tokens create proposalai
   # Output: eyJhbG...  (save this!)
   ```
6. Build your `DATABASE_URL`:
   ```
   libsql://proposalai-<your-username>.turso.io?authToken=<your-token>
   ```

### Step 2 — Render Backend

1. Push your repo to GitHub.
2. Go to [render.com](https://render.com) → **New** → **Blueprint**.
3. Connect your GitHub repo. Render auto-detects `render.yaml`.
4. Set environment variables in the Render dashboard:

   | Variable | Value |
   |----------|-------|
   | `GEMINI_API_KEY` | Your key from [AI Studio](https://aistudio.google.com/apikey) |
   | `DATABASE_URL` | `libsql://proposalai-<you>.turso.io?authToken=<token>` |
   | `FRONTEND_ORIGIN` | `https://your-app.vercel.app` (set after Step 3) |

5. Deploy. Note your Render URL (e.g. `https://proposalai-api.onrender.com`).
6. Verify: `curl https://proposalai-api.onrender.com/healthz` → `{"status":"ok"}`

### Step 3 — Vercel Frontend

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repo.
3. Set the **Root Directory** to `frontend`.
4. Set environment variable:

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://proposalai-api.onrender.com` |

5. Deploy. Note your Vercel URL (e.g. `https://your-app.vercel.app`).
6. Go back to Render and set `FRONTEND_ORIGIN` to your Vercel URL.

### You're live! 🚀

Visit your Vercel URL. The first load may take ~30s while Render spins up from cold start (free tier limitation).

---

## Environment Variables

### Backend (set in `.env` locally, or in Render dashboard for production)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key |
| `DATABASE_URL` | — | `sqlite:///app.db` | Database connection URL |
| `FRONTEND_ORIGIN` | — | `http://localhost:5173` | Allowed CORS origin |

### Frontend (set in Vercel dashboard for production)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | — | `http://localhost:8000` | Backend API base URL |

---

## Project Structure

```
├── .env.example          # Environment variable template
├── render.yaml           # Render deployment blueprint
├── README.md
├── backend/
│   ├── main.py           # FastAPI application + /healthz
│   ├── database.py       # SQLAlchemy engine (SQLite / Turso / Postgres)
│   ├── models.py         # Pydantic request/response models
│   ├── gemini_client.py  # Gemini API integration
│   ├── seed.py           # Seed data loader
│   ├── seed_data.json    # Sample data for demo
│   └── requirements.txt
└── frontend/
    ├── vercel.json       # Vercel SPA config
    ├── src/
    │   ├── App.tsx        # Router & layout
    │   ├── api.ts         # API client (reads VITE_API_URL)
    │   ├── types.ts       # TypeScript interfaces
    │   ├── pages/         # Profile, NewProposal, History
    │   └── components/    # Reusable UI components
    ├── package.json
    └── vite.config.ts
```

## Tech Stack

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS     |
| Backend   | Python 3.10+, FastAPI, Uvicorn, SQLAlchemy   |
| AI        | Google Gemini 2.5 Flash                      |
| Database  | SQLite (dev) / Turso libSQL (prod)           |
| Hosting   | Vercel (frontend) + Render (backend)         |

## API Endpoints

| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | `/healthz`                  | Health check (200 OK)          |
| GET    | `/api/profile`              | Get user profile               |
| PUT    | `/api/profile`              | Update bio & skills            |
| GET    | `/api/portfolio`            | List portfolio items           |
| POST   | `/api/portfolio`            | Add portfolio item             |
| PUT    | `/api/portfolio/{id}`       | Update portfolio item          |
| DELETE | `/api/portfolio/{id}`       | Delete portfolio item          |
| POST   | `/api/proposals/generate`   | Generate proposal from job post|
| GET    | `/api/proposals`            | List all proposals             |
| GET    | `/api/proposals/{id}`       | Get proposal detail            |
| PUT    | `/api/proposals/{id}`       | Update proposal text           |

## License

MIT
