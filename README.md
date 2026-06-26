# Drift 2.0 — Turn Deadline Extensions Into Behavioral Insights

**Drift** is a premium, full-stack AI-driven productivity application designed to help professionals understand *why* they extend deadlines and intervene *before* they miss their targets. 

Unlike traditional task managers that let users arbitrarily push dates or overwrite history, Drift logs and tags every single timeline adjustment. By collecting this behavioral data, Drift calculates task risk factors, provides tailored voice coaching, and automatically designs weekday calendar recovery plans.

---

## 🚀 Core Features

Drift implements exactly four core algorithmic and AI services:

1. **Drift Risk Engine (Deterministic Heuristic)**
   * Calculates a **Drift Probability Score (0–100%)** live as you type your task.
   * Weighs overall profile ratios, category statistics, title keyword matches, and deadline tightness compared to historical completions.
   * Provides a plain-English preview: *"You extend design tasks 70% of the time. Consider adding 2 days."*

2. **Smart Extension Coach with Voice Input (Gemini AI)**
   * Triggered when a deadline changes, prompting the user with text or voice recording options.
   * Uses browser `MediaRecorder` API with an animated CSS waveform.
   * Automatically uploads raw audio to **Gemini 1.5 Flash** for simultaneous transcription and behavioral analysis, returning a structured tag (`Technical Blocker`, `Underestimated Effort`, `External Dependency`, `Scope Creep`, `Personal`), coach reflection sentence, and severity rating.

3. **Calendar Rescue Scheduler (EDF Greedy Scheduler)**
   * A custom, hand-written Earliest-Deadline-First (EDF) scheduler.
   * Triggered automatically upon every extension to allocate 2-hour blocks inside weekday working hours (Mon-Fri, 9:00 AM - 6:00 PM), skipping occupied blocks.
   * Visualizes recommendations as color-coded cards inside the Task Details panel.

4. **Proactive Intervention Alerts**
   * Background analyzer running on page loads to capture risk points:
     - Active tasks due within 48h with `0` checklist checkboxes checked.
     - Tasks with a Drift Score over 70% due within 7 days.
     - Tasks extended 3 or more times.
   * Visualizes non-intrusive marquee warning banners with single-click navigation to visual schedules.

---

## 🛠️ Tech Stack

* **Backend**: FastAPI (Python 3.8+) + SQLAlchemy ORM
* **Database**: SQLite (local development `drift.db`) / PostgreSQL (production connection)
* **Authentication**: JWT (JSON Web Tokens) with `python-jose` + `passlib[bcrypt]`
* **AI Engine**: Google Gemini API (`gemini-1.5-flash`)
* **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons

---

## 📂 Project Directory Structure

```text
DRIFT 2.0/
├── drift-backend/
│   ├── app/
│   │   ├── database.py       # SQLAlchemy engine & session maker
│   │   ├── models.py         # SQLAlchemy database models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── auth.py           # JWT token guards & password bcrypt utilities
│   │   ├── routers/
│   │   │   ├── tasks.py      # CRUD, live risk engine preview
│   │   │   ├── extensions.py # Extension logging, Gemini coach, auto-scheduler
│   │   │   ├── schedule.py   # Schedule blocks retrieval & regeneration
│   │   │   ├── insights.py   # Analytics metrics & Drift Hall of Fame
│   │   │   └── interventions.py # Alert evaluation & dismiss triggers
│   │   ├── services/
│   │   │   ├── drift_engine.py  # Heuristic risk calculator
│   │   │   ├── gemini_service.py# AI transcriptions & coach calls
│   │   │   ├── scheduler.py     # Custom greedy EDF scheduler
│   │   │   └── intervention_engine.py # Alert evaluation checks
│   │   └── main.py           # CORS config, routers mount, auth routes
│   ├── tests/
│   │   └── test_services.py  # Unit tests for services (using in-memory db)
│   ├── requirements.txt
│   └── .env.example
│
└── drift-frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.ts     # Axios wrapper with JWT token inject
    │   ├── types/
    │   │   └── index.ts      # TypeScript interfaces matching Pydantic schemas
    │   ├── hooks/
    │   │   ├── useDriftScore.ts
    │   │   └── useIntervention.ts
    │   ├── components/
    │   │   ├── DriftScoreBadge.tsx
    │   │   ├── InterventionBanner.tsx
    │   │   ├── TimelineView.tsx
    │   │   ├── ScheduleBlocks.tsx
    │   │   └── SkeletonLoader.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── NewTask.tsx
    │   │   ├── TaskDetail.tsx
    │   │   ├── CalendarPage.tsx
    │   │   ├── Insights.tsx
    │   │   ├── Login.tsx
    │   │   └── Register.tsx
    │   ├── App.tsx           # Authentication Context & responsive layout wrapper
    │   ├── index.css         # Styling system base configuration
    │   └── main.tsx          # Vite bootstrap entrypoint
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── vite.config.ts
    └── index.html
```

---

## 🗄️ Database Schema

### 1. Users
* `id` (int, PK)
* `email` (string, Unique, Index)
* `password_hash` (string)
* `name` (string)
* `created_at` (datetime)

### 2. Tasks
* `id` (int, PK)
* `user_id` (int, FK -> Users.id)
* `title` (string)
* `description` (text)
* `category` (string)
* `original_deadline` (datetime)
* `current_deadline` (datetime)
* `status` (string: `'active'` / `'completed'` / `'overdue'`)
* `drift_score` (int: 0–100)
* `drift_explanation` (text)
* `created_at` (datetime)

### 3. Extensions
* `id` (int, PK)
* `task_id` (int, FK -> Tasks.id)
* `extended_by_days` (int)
* `raw_reason` (text)
* `raw_transcription` (text)
* `ai_tag` (string: one of the 5 coaching categories)
* `ai_reflection` (text)
* `severity` (int: 1–3)
* `input_method` (string: `'voice'` / `'text'`)
* `timestamp` (datetime)

### 4. ScheduleSuggestions
* `id` (int, PK)
* `task_id` (int, FK -> Tasks.id)
* `suggested_blocks` (json: array of `{start, end, label}`)
* `generated_at` (datetime)
* `auto_triggered` (boolean)

### 5. InterventionLog
* `id` (int, PK)
* `user_id` (int, FK -> Users.id)
* `task_id` (int, FK -> Tasks.id)
* `intervention_type` (string)
* `message` (text)
* `dismissed` (boolean, default=False)
* `created_at` (datetime)

---

## ⚙️ Setup and Installation

### 1. Backend Setup
1. Open a terminal and navigate to `drift-backend/`:
   ```bash
   cd drift-backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Unix/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and insert your Gemini API Key:
   ```bash
   cp .env.example .env
   ```
   Modify `.env` and assign your Google AI Studio key to `GEMINI_API_KEY`.
5. Run the services test suite:
   ```bash
   python -m pytest tests/
   ```
6. Start the API server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   Interactive Swagger API docs will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
1. Open a new terminal and navigate to `drift-frontend/`:
   ```bash
   cd drift-frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Start the client server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser.

---

## 🧑‍⚖️ 2-Minute Demo Script (For Hackathon Presentation)

Present the completed product with this demonstration path:

1. **Sign Up**: Register a new user at `http://localhost:5173/register`. Submit to log in automatically and land on the **Dashboard**.
2. **Form Live Preview (AI Risk Engine)**:
   * Click **New Task**.
   * As you type the title (*"Build oauth endpoints"*), select the category (*"Development"*), and choose a deadline 2 days from now, watch the **Radial gauge update live in 500ms**!
   * Notice the Coach text: *"This deadline is tight compared to your historical average..."*
   * Type markdown checkbox items in the description (e.g. `- [ ] setup routers`, `- [ ] write db code`).
   * Click **Create Task**.
3. **Behavioral Notification (Intervention Banner)**:
   * Return to the **Dashboard**. Since the new task is due in under 48 hours and has zero checklists checked off, the **Proactive Alert Banner** slides in immediately.
   * Observe how the message incorporates category-level risk stats dynamically.
4. **EDF Rescue Scheduler (Greedy Algorithm)**:
   * Click **View Rescue Schedule** inside the alert banner, or click the task card to open the **Task Detail** page.
   * Look at the **Visual Rescue Schedule** card to see work blocks scheduled for tomorrow, demonstrating the EDF weekday layout.
5. **Smart Coach Dialogue (Gemini voice coaching)**:
   * In **Task Detail**, click **Extend Deadline**.
   * Enter `3` days.
   * Choose **Voice Note (Option B)**, click **Start Voice Note**, and record: *"I had to rewrite the router authentication because the client updated their library specs."*
   * Click stop. The waveforms will halt, and the screen will immediately present the AI Coach assessment:
     - **Tag**: `Scope Creep` or `Technical Blocker`
     - **Severity**: `2` or `3`
     - **Reflection**: *"This is a library specify delay. Consider spiking dependencies earlier."*
   * Click **Sync Timeline & Close Coach**.
   * Inspect the updated horizontal **Deadline Path Timeline** indicating the delay details, and see the **Rescue Schedule** automatically recalculate to allocate blocks!
