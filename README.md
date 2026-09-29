# RecallOps 🧠⚡

> **Remember the incident. Learn the solution. Solve the next one smarter.**

[![Vercel](https://img.shields.io/badge/Vercel-Frontend%20Live-black?logo=vercel&logoColor=white)](https://recallops-ashy.vercel.app)
[![Render](https://img.shields.io/badge/Render-Backend%20Live-46E3B7?logo=render&logoColor=white)](https://recallops-8qk9.onrender.com)
[![Hindsight Cloud](https://img.shields.io/badge/Hindsight-Memory%20Online-6366F1)](https://api.hindsight.vectorize.io)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)

## 🌐 Live Production Deployments

- **Frontend Web App (Vercel)**: [`https://recallops-ashy.vercel.app`](https://recallops-ashy.vercel.app)
- **Backend API (Render)**: [`https://recallops-8qk9.onrender.com`](https://recallops-8qk9.onrender.com) (Health: [`https://recallops-8qk9.onrender.com/health`](https://recallops-8qk9.onrender.com/health))
- **Neural Memory Bank**: Vectorize Hindsight Cloud (`recallops-incidents`)
- **Auth & Database**: Supabase Authentication & PostgreSQL

RecallOps is an AI-powered Incident Response Agent built for the **"AI Agents That Learn Using Hindsight"** hackathon. It uses **Hindsight (by Vectorize)** as its persistent long-term memory layer to learn from every production incident — storing root causes, resolutions, failed attempts, and engineer feedback — so that when the next similar incident hits, it already knows what works.

## 🚀 The Core Loop

```
Incident → Recall → Investigate → Resolve → Learn → Remember → Improve
```

1. **Incident Created** — Engineer reports a new production incident
2. **Recall** — RecallOps searches Hindsight memory for similar past incidents
3. **Investigate** — Groq AI synthesizes memories with current context → actionable recommendation
4. **Resolve** — Engineer resolves the incident, optionally noting the root cause
5. **Learn** — Engineer submits feedback: what worked, what failed, lessons learned
6. **Remember** — Experience retained to Hindsight for future recall
7. **Improve** — Next similar incident gets a 91% confidence recommendation instead of 25%

## ✨ Key Features

- 🧠 **Hindsight Memory** — Persistent, semantic vector memory across incidents
- ⚡ **Groq AI Analysis** — Fast LLM analysis with institutional memory context
- ⚠️ **Failed Attempt Warnings** — Explicitly warns about approaches that previously failed
- 📊 **Real-time Dashboard** — SRE-style incident dashboard with live stats
- 📝 **AI Post-Mortems** — Auto-generated structured post-mortems, retained to memory
- 🔍 **Memory Search** — Semantic search across the organizational knowledge base
- 🔄 **Local Fallback** — Works without Hindsight API (local JSON file fallback)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RecallOps                                │
│                                                                  │
│  React Frontend (Vite + TailwindCSS v4)                        │
│  ↕ REST API (JSON)                                              │
│  ASP.NET Core 10 Backend                                        │
│  ├── AgentService: orchestrates Recall → Analyze → Remember     │
│  ├── IncidentService: CRUD + event logging                      │
│  ├── IHindsightClient → HindsightClient (Live) or              │
│  │                      LocalMemoryClient (Fallback)            │
│  ├── IGroqClient → GroqClient (LLM analysis)                   │
│  └── RecallOpsDbContext → PostgreSQL 17                        │
└─────────────────────────────────────────────────────────────────┘
```

**Hindsight API calls:**
- `POST /v1/default/banks/recallops-incidents/memories` — Retain experience
- `POST /v1/default/banks/recallops-incidents/memories/recall` — Recall similar incidents

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, TailwindCSS v4, lucide-react, react-router-dom |
| Backend | ASP.NET Core 10, C# 13 |
| AI | Groq API (qwen3-32b / llama-3.3-70b-versatile) |
| Memory | Hindsight by Vectorize (cloud) or LocalMemoryClient (JSON fallback) |
| Database | PostgreSQL 17, Entity Framework Core 10, Npgsql |
| Container | Docker Compose |

## ⚡ Quick Start

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for PostgreSQL)
- [Groq API Key](https://console.groq.com) (free)
- [Hindsight API Key](https://ui.hindsight.vectorize.io) (optional — local fallback works)

### 1. Start PostgreSQL

```bash
docker-compose up -d postgres
```

### 2. Configure API Keys

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:
```env
GROQ_API_KEY=gsk_your_key_here
HINDSIGHT_API_KEY=your_key_here   # optional
HINDSIGHT_MODE=Local              # or Live
```

### 3. Start the Backend

```bash
# Set environment variables (or create appsettings.Development.json)
$env:Groq__ApiKey="gsk_your_groq_key"
$env:Hindsight__ApiKey="your_hindsight_key"
$env:Hindsight__Mode="Local"

dotnet run --project RecallOps.Api
```

The API runs at `http://localhost:5000`. EF migrations run automatically.

### 4. Start the Frontend

```bash
cd RecallOps.Web
npm install
npm run dev
```

Open `http://localhost:5173`

### 5. Seed Historical Incidents

Click **Seed Memory** in the sidebar, or:

```bash
curl -X POST http://localhost:5000/api/admin/seed-memory
```

This loads 25 realistic historical incidents into the Hindsight memory bank.

## 🎬 Demo Script

This demo shows the power of learning: **same service, same error, but a 91% confidence recommendation the second time**.

### Step 1: Seed Historical Memory

Click **Seed Memory** in sidebar. This pre-loads 25 incidents (but NOT the demo incident).

### Step 2: Create the First Incident (No Memory)

Create an incident with these values:
- **Service:** Payment API
- **Severity:** Critical
- **Environment:** Production  
- **Error:** `502 Bad Gateway`
- **Description:** Payment gateway returning 502 errors to all clients
- **Recent Changes:** Payment gateway timeout increased from 30s to 60s
- **Symptoms:** High error rate, customers cannot complete checkout

Click **Investigate with AI** → Notice confidence ~30%, generic recommendations, no historical context.

### Step 3: Submit Feedback (Learn)

After resolving:
- **Root Cause:** PostgreSQL connection pool exhausted (pool size: 50)
- **What Worked:** Increased connection pool from 50 to 100 connections
- **What Failed:** Increasing payment gateway timeout was unrelated to root cause
- **Lesson:** Always check DB connection pool first before adjusting gateway timeouts

Click **Save to Memory** → Experience retained to Hindsight!

### Step 4: Create the Same Incident Again

Create another Payment API / 502 incident. Click **Investigate with AI**.

**Observe:**
- 🧠 **Memory Used: Yes**
- 📊 **Confidence: 91%** (up from 30%)
- 🎯 **Identifies correct root cause** from historical pattern
- ⚠️ **Warns:** "Gateway timeout increase was unrelated to root cause — DO NOT TRY"

This is the **learning moment** — the system now has institutional memory.

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/incidents` | Create incident |
| `GET` | `/api/incidents` | List incidents |
| `GET` | `/api/incidents/{id}` | Get incident |
| `POST` | `/api/incidents/{id}/investigate` | AI investigation |
| `POST` | `/api/incidents/{id}/resolve` | Mark resolved |
| `POST` | `/api/incidents/{id}/feedback` | Submit feedback + save to memory |
| `GET` | `/api/incidents/{id}/postmortem` | Generate post-mortem |
| `GET` | `/api/incidents/{id}/events` | Get event timeline |
| `GET` | `/api/memory/search?q=...` | Search memory bank |
| `GET` | `/api/memory/count` | Count memories |
| `GET` | `/api/dashboard` | Dashboard stats |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/admin/seed-memory` | Seed demo data |
| `POST` | `/api/admin/reset-demo` | Reset demo |

## 🔧 Configuration

### appsettings.json

```json
{
  "Hindsight": {
    "Mode": "Local",          // "Live" or "Local"
    "BaseUrl": "https://api.hindsight.vectorize.io",
    "ApiKey": ""              // Set via env: Hindsight__ApiKey
  },
  "Groq": {
    "ApiKey": "",             // Set via env: Groq__ApiKey
    "DefaultModel": "qwen/qwen3-32b",
    "FallbackModel": "llama-3.3-70b-versatile"
  }
}
```

### Hindsight Modes

| Mode | Description |
|------|-------------|
| `Live` | Uses Hindsight Cloud API with automatic fallback to Local |
| `Local` | Persists memories to `data/local-memory.json` using keyword search |

## 📁 Project Structure

```
recallops/
├── RecallOps.Api/                 # ASP.NET Core backend
│   ├── Controllers/               # HTTP controllers
│   │   ├── IncidentController.cs  # Incident CRUD + investigate/feedback
│   │   ├── MemoryController.cs    # Search & count memory
│   │   ├── DashboardController.cs # Dashboard stats
│   │   ├── AdminController.cs     # Seed/reset operations
│   │   └── HealthController.cs    # Health checks
│   ├── Services/
│   │   ├── AgentService.cs        # Recall → Analyze → Remember
│   │   └── IncidentService.cs     # Incident CRUD + validation
│   ├── Hindsight/
│   │   ├── IHindsightClient.cs    # Memory interface
│   │   ├── HindsightClient.cs     # Live cloud client
│   │   ├── LocalMemoryClient.cs   # Local JSON fallback
│   │   └── FallbackHindsightClient.cs # Auto-fallback wrapper
│   ├── AI/
│   │   └── GroqClient.cs          # Groq LLM client
│   ├── Models/                    # EF Core entities
│   ├── DTOs/                      # Request/response DTOs
│   ├── Data/
│   │   ├── RecallOpsDbContext.cs  # EF DbContext
│   │   ├── Seed/                  # Historical incident seeder (25 incidents)
│   │   └── Migrations/            # EF migrations
│   └── Infrastructure/
│       └── GlobalExceptionMiddleware.cs
├── RecallOps.Web/                 # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx      # Live dashboard
│       │   ├── CreateIncident.jsx # Incident creation form
│       │   ├── IncidentDetail.jsx # Incident view + resolve
│       │   ├── Investigation.jsx  # AI investigation + feedback
│       │   ├── MemoryTimeline.jsx # Visual memory timeline
│       │   ├── MemorySearch.jsx   # Memory search
│       │   └── PostMortem.jsx     # AI post-mortem generator
│       ├── components/
│       │   └── Layout.jsx         # Sidebar + nav
│       ├── api.js                 # Axios API client
│       └── utils.js               # Helpers
└── docker-compose.yml             # PostgreSQL
```

## 🏆 Hackathon: AI Agents That Learn Using Hindsight

RecallOps demonstrates all three key elements:

1. **AI Agent** — Orchestrates recall → analyze → remember in a single workflow
2. **Learning** — Every incident enriches the memory bank, improving future accuracy
3. **Hindsight** — The memory layer that makes institutional knowledge retrievable

The before/after demo clearly shows the value: 25% confidence generic recommendations vs. 91% confidence specific recommendations with warnings about what NOT to try.

---

Built with ❤️ for the Hindsight hackathon. "Make every production incident a lesson that helps solve the next one faster."
