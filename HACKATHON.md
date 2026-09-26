# 🌊 Drift 2.0 — Codebase Technical Specification & Hackathon Overview

This document presents a comprehensive, code-verified breakdown of the **Drift 2.0** codebase. Every section maps directly to production algorithms, database layers, and front-end modules within the repository.

---

## 🎯 Selected Challenge: The Last-Minute Life Saver

### Problem Statement
Traditional task planners encourage **silent schedule slippage** because they require zero accountability to push a deadline. This enables the **Planning Fallacy** (cognitive bias to underestimate task durations). 

### Solution Architecture
Drift 2.0 introduces **deliberate cognitive friction**:
1. Every deadline extension request requires a multimodal (audio or text) justification.
2. The system analyzes the reason using Gemini, maps it against historical patterns, and computes a risk score.
3. It automatically updates the user's schedule with **focused Rescue Blocks** to lock in catch-up time.

---

## 🧠 Core Engineering & Algorithmic Implementations

### 1. The Drift Risk Prediction Engine
Implemented in: **[drift_engine.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-backend/app/services/drift_engine.py)**

The system calculates a real-time **Drift Probability Score (0–100%)** before task submission. It weighs four distinct heuristic metrics:

$$\text{Drift Score} = (0.40 \cdot R_{\text{category}}) + (0.20 \cdot R_{\text{global}}) + (0.20 \cdot R_{\text{keyword}}) + (0.20 \cdot F_{\text{tightness}})$$

* **Category Rate ($R_{\text{category}}$)**: The user's historical delay rate for tasks matching the current category.
* **Global Rate ($R_{\text{global}}$)**: The user's overall delay rate across all historical tasks.
* **Keyword Rate ($R_{\text{keyword}}$)**: The input task title is tokenized into keywords (length $\ge 3$). The engine intersects these with historical task titles to calculate a matched keyword delay coefficient.
* **Deadline Tightness Factor ($F_{\text{tightness}}$)**: Compares the requested task duration ($D_{\text{given}}$) against the historical average completion duration for that category ($D_{\text{avg}}$):
  $$F_{\text{tightness}} = \begin{cases} 
    0.5 + 0.5 \cdot \left(1 - \frac{D_{\text{given}}}{D_{\text{avg}}}\right) & \text{if } D_{\text{given}} < D_{\text{avg}} \\
    0.5 \cdot \left(\frac{D_{\text{avg}}}{D_{\text{given}}}\right) & \text{if } D_{\text{given}} \ge D_{\text{avg}} 
  \end{cases}$$

---

### 2. The Calendar Rescue Scheduler (Greedy EDF)
Implemented in: **[scheduler.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-backend/app/services/scheduler.py)**

To enforce actual schedule recovery, the scheduler allocates physical blocks of time to catch up:
* **Time Penalty Formula**: Every 1 day of deadline extension maps to **2 hours** of focused rescue blocks:
  $$\text{Blocks Needed} = \lceil \frac{\text{Total Extended Days} \cdot 2}{2} \rceil$$
* **Scheduling Window**: Allocates blocks starting from the next calendar day. It limits scheduling to weekdays (Monday–Friday) and maps them into four fixed, 2-hour slots during standard business hours:
  * **Slot 0**: 09:00 - 11:00
  * **Slot 1**: 11:00 - 13:00
  * *(Skipping Lunch: 13:00 - 14:00)*
  * **Slot 2**: 14:00 - 16:00
  * **Slot 3**: 16:00 - 18:00
* **Greedy Conflict Resolution**: Sorts all active tasks by `current_deadline` ascending (Earliest Deadline First) and books slots sequentially, skipping previously occupied slot coordinates.

---

### 3. The Proactive Intervention Engine
Implemented in: **[intervention_engine.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-backend/app/services/intervention_engine.py)**

Monitors active task metrics on page load and writes dismissible alerts to the database database using three triggers:
* **Checklist Stagnation**: Parses markdown checkbox patterns (`[ ]` vs `[x]` / `[X]`) in the task description. If a task is due within **48 hours** and has `0` completed checklist items, it triggers a warning.
* **High-Risk Profiles**: If a task has a computed Drift Score $> 70\%$ and is due within **7 days**, it alerts the user.
* **Frequent Delays**: If a task has been extended $\ge 3$ times, it logs a warning.

---

### 4. Multimodal AI Handoff & Cognitive Coaching
Implemented in: **[gemini_service.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-backend/app/services/gemini_service.py)**

When a user logs a delay:
* **Voice-Enabled Input**: The frontend utilizes the HTML5 **MediaRecorder API** to record the user's speech, exporting it as an audio blob.
* **Multimodal API Call**: The backend converts the audio bytes and passes them alongside a structured instructions prompt to the **Gemini 1.5 Flash** model via the asynchronous client API.
* **Cognitive Coaching Output**: Gemini transcribes the audio, parses the delay reason, classifies it into one of five categories (`Technical Blocker`, `Underestimated Effort`, `External Dependency`, `Scope Creep`, `Personal`), rates the pattern severity (1–3), and generates a constructive reflection referencing the user's historical delay profile.

---

### 5. Client-Side Interactive Risk Simulator
Implemented in: **[Landing.tsx](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-frontend/src/pages/Landing.tsx)**

To engage hackathon judges immediately before login, the landing page hosts a client-side **Interactive Drift Risk Simulator** mirroring the core backend heuristic engine:
* Dynamically calculates scores based on active input changes (e.g. selecting `Academia` adds `+25` base risk; title keywords containing `final`/`report`/`exam` add `+15`).
* Visually charts progress bars and prints real-time Gemini Forecast mock suggestions based on risk levels.

---

## 🔧 Database Architecture & Resilient Setup

### High-Availability Fallback
Implemented in: **[database.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-backend/app/database.py)**

Drift is designed to adapt to runtime infrastructure issues:
* **Database Swapping**: On startup, it attempts to bind to the PostgreSQL production server. If the connection fails (e.g., PostgreSQL is starting up or unreachable), it catches the exception and falls back to a local SQLite database (`drift.db`).
* **Concurrency Tuning**: Registers a connection listener on the synchronous database engine to configure the local SQLite file for **Write-Ahead Logging (WAL)** and **Normal Synchronization**:
  ```python
  @event.listens_for(engine, "connect")
  def set_sqlite_pragma(dbapi_connection, connection_record):
      cursor = dbapi_connection.cursor()
      cursor.execute("PRAGMA journal_mode=WAL")
      cursor.execute("PRAGMA synchronous=NORMAL")
      cursor.close()
  ```
  This header persistency allows safe concurrent reads/writes for asynchronous FastAPI routes and background workers without database lock exceptions.

### Schema Blueprint (SQLite & PostgreSQL)
Defined in: **[models.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/DRIFT%202.0/drift-backend/app/models.py)**
* **User**: Manages profile and credentials. Password hashes are generated using Python's standard library `hashlib.pbkdf2_hmac` (`SHA256` iterations) with dynamic imports to verify legacy bcrypt hashes, ensuring dependency compatibility across platforms.
* **Task**: Mapped to owner `User.id` with cascade deletions. Contains task metrics (`drift_score`, `original_deadline`, `current_deadline`).
* **Extension**: Stores the delay logs (`extended_by_days`, `ai_tag`, `ai_reflection`, `severity`, and the multimodal `raw_transcription`).
* **ScheduleSuggestion**: Houses the active rescue slots in JSON format.
* **InterventionLog**: Stores dismissible warning alert banners.

---

## 📡 REST API Specifications

The core endpoints coordinate user interactions:
* `POST /api/auth/register` / `POST /api/auth/login` — JWT Authentication layer.
* `GET /api/tasks` / `POST /api/tasks` — Task creation and drift scores.
* `DELETE /api/tasks/{id}` — Cascade deletion of tasks and associated schedule suggestions.
* `POST /api/tasks/{id}/extensions` — Form-data ingestion endpoint supporting text/audio files to trigger the Gemini analysis.
* `GET /api/schedule` — Fetches current rescue schedule blocks.
* `GET /api/interventions` / `POST /api/interventions/{id}/dismiss` — Alerts management.
* `GET /api/insights` — Pulls data aggregates for charts.

---

## 🌐 Google Cloud & Firebase Integration Architecture

1. **Google Cloud Run**: Runs the containerized FastAPI backend. Uvicorn dynamically binds to the `$PORT` environment variable assigned by Google.
2. **Google Cloud SQL (PostgreSQL)**: Serves as the primary production database, linked via Cloud SQL connection names.
3. **Firebase Hosting**: Hosts the compiled static React/Vite assets. All routes rewrite to `index.html` via a customized `firebase.json` mapping to support client-side routing on page refresh.
