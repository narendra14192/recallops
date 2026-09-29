# RecallOps — Technical Architecture & System Design 🧠⚡

> **Autonomous Incident Intelligence with Persistent Neural Memory**  
> Built for the *"AI Agents That Learn Using Hindsight"* Hackathon (Engineering & DevOps Track)

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph ClientLayer ["1. Client & Presentation Layer (Vercel)"]
        UI["React 19 + Vite Web Application<br/>(TailwindCSS v4 • Lucide Icons)"]
        AuthContext["Auth Context & Route Guards<br/>(Session Persistence & State Sync)"]
        UI --> AuthContext
    end

    subgraph AuthLayer ["2. Identity & Security Layer (Supabase)"]
        SB_Auth["Supabase Authentication<br/>(Email/Password • Session JWT)"]
        SB_DB[("Supabase PostgreSQL<br/>(Enterprise Data Store)")]
        AuthContext <-->|"HTTPS / WSS"| SB_Auth
    end

    subgraph CoreBackend ["3. SRE Agent Orchestrator (Render)"]
        API["RecallOps.Api (.NET 10 Web API)<br/>Kestrel Server • Linux Container"]
        AgentSvc["AgentService<br/>(Context Assembly & Prompt Synthesis)"]
        IncidentSvc["IncidentService<br/>(Lifecycle & Event Tracking)"]
        MemSeeder["IncidentMemorySeeder<br/>(25 Pre-Seeded Failure Modes)"]
        LocalDB[("SQLite / PostgreSQL<br/>(Operational DB)")]

        API --> AgentSvc
        API --> IncidentSvc
        API --> MemSeeder
        IncidentSvc --> LocalDB
    end

    subgraph IntelligenceLayer ["4. Neural Memory & Fast Reasoning"]
        Hindsight["Vectorize Hindsight Cloud<br/>(Bank: recallops-incidents • 180+ Memories)"]
        Groq["Groq LPU Inference Engine<br/>(openai/gpt-oss-120b & qwen/qwen3.8-27b)"]
        
        AgentSvc <-->|"1. Semantic Recall & Rerank"| Hindsight
        AgentSvc <-->|"2. Synthesize & Formulate Fix"| Groq
        AgentSvc -.->|"3. Retain Post-Mortem & Learnings"| Hindsight
    end

    UI <-->|"REST API (JSON / HTTPS)"| API
    API <-->|"Database Connection"| SB_DB
```

---

## 2. The Continuous Memory Feedback Loop

The core innovation of RecallOps is that **it never forgets a production outage**. Unlike stateless LLMs that treat every alert as a brand-new problem, RecallOps continuously enriches its memory bank.

```mermaid
sequenceDiagram
    autonumber
    actor Engineer as On-Call SRE
    participant UI as RecallOps Frontend (Vercel)
    participant Agent as AgentService (.NET 10)
    participant Hindsight as Vectorize Hindsight Cloud
    participant Groq as Groq LPU (GPT-OSS-120B)
    participant DB as Database (Postgres/SQLite)

    Note over Engineer,DB: Phase 1: Ingestion & Triage
    Engineer->>UI: Reports / Receives Alert (e.g. INC-1003: 502 Bad Gateway)
    UI->>Agent: POST /api/incidents/{id}/investigate
    Agent->>DB: Fetch Incident Context (Service, Logs, Recent Changes)

    Note over Agent,Hindsight: Phase 2: Neural Memory Recall
    Agent->>Hindsight: POST /v1/default/banks/recallops-incidents/memories/recall<br/>(Query: "Payment API 502 Bad Gateway timeout increase")
    Hindsight-->>Agent: Returns Matched Memories (INC-1002, 98% Confidence,<br/>Root Cause: Connection pool exhaustion, Failed Attempt: Timeout increase)

    Note over Agent,Groq: Phase 3: Fast Multi-Model Synthesis
    Agent->>Groq: Chat Completion with System Prompt + Historical Context + Dead-End Warning
    Groq-->>Agent: Actionable SRE Guidance (Confidence: 95%, Scaled pool to 100, Warning: Do not touch timeout)
    Agent-->>UI: Structured Response (Analysis, Runbook, Checklist, Dead-End Alert)

    Note over Engineer,UI: Phase 4: Resolution & Verification
    Engineer->>UI: Executes Fix & Submits Resolution Feedback
    UI->>Agent: POST /api/incidents/{id}/resolve

    Note over Agent,Hindsight: Phase 5: Feedback Retention (Learning)
    Agent->>Hindsight: POST /v1/default/banks/recallops-incidents/memories<br/>(Retain: Resolution, Root Cause, Verified Solution, Execution Duration)
    Hindsight-->>Agent: 200 OK (Indexed in Vector Mesh)
    Agent->>DB: Mark Incident RESOLVED & Store Audit Log
    Agent-->>UI: Resolution Confirmed (Memory Bank Updated)
```

---

## 3. Technology Stack Matrix

| Layer | Technology | Role & Responsibility | Hosting / Infra |
|---|---|---|---|
| **Frontend** | **React 19 + Vite** | High-performance SPA with client-side routing, micro-animations, and SRE command console | **Vercel** (Global Edge CDN) |
| **Styling** | **TailwindCSS v4** | Dark-mode cybernetic design system with custom CSS variables | Built in Vite bundle |
| **Auth** | **Supabase Auth** | JWT-based user authentication, password hashing, and session persistence | **Supabase Cloud** |
| **Backend API** | **.NET 10 Web API** | High-throughput asynchronous REST API with Kestrel web server | **Render** (Linux Container) |
| **Memory Engine** | **Vectorize Hindsight** | Long-term episodic memory, semantic vector search, dynamic cross-incident reranking | **Hindsight Cloud** |
| **Reasoning Engine** | **Groq LPU** | Ultra-low latency LLM inference (`openai/gpt-oss-120b`, fallback `qwen/qwen3.8-27b`) | **Groq Cloud API** |
| **Database** | **PostgreSQL / SQLite** | Relational state management for incident lifecycles, event audits, and telemetry | **Supabase / SQLite** |

---

## 4. Key Differentiators & Memory Architecture

### 1. Cross-Incident Temporal Memory
- **Problem**: When on-call engineers rotate, institutional knowledge is lost in Slack or outdated Notion pages.
- **Solution**: RecallOps stores structured facts in Hindsight with tags (`service:payment-api`, `severity:critical`, `type:connection-pool`). Hindsight's vector reranker surfaces the exact matching incident (`INC-1002`) with **98% semantic similarity**.

### 2. Dead-End Flagging (Negative Learning)
- **Problem**: Engineers waste 30–60 minutes trying fixes that were already proven ineffective during previous outages.
- **Solution**: Hindsight memory explicitly catalogs `Failed Attempts` (e.g., *"Increasing gateway timeout from 30s to 60s failed previously"*). Groq is instructed to generate a prominent warning banner preventing the engineer from repeating the mistake.

### 3. Graceful Multi-Tier Fallback
- If Groq encounters API limits, it falls back to `qwen/qwen3.8-27b`.
- If external LLM calls time out, `AgentService.BuildFallbackAnalysis` dynamically reconstructs the exact runbook and root-cause fix directly from Hindsight memory facts with **95% baseline confidence**.

---

## 5. Deployment Topology

```
[ User Browser ]
       │
       ▼ (HTTPS)
[ Vercel Edge Network ] ─── (Vite React 19 SPA)
       │
       ├─── Auth Requests ──────────► [ Supabase Cloud ] (JWT / Auth API)
       │
       └─── API Requests (/api/*) ──► [ Render Docker Web Service ]
                                              │
                                              ├──► [ Vectorize Hindsight ] (Memory Bank)
                                              ├──► [ Groq Cloud ] (LLM Inference)
                                              └──► [ Relational Database ] (State & Audit)
```
