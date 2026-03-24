# Athena Design Document

**Date:** 2026-03-06
**Project:** Athena — A Strategic Career Engineer Agent with Project Lifecycle Management

## Overview

Athena is a career-focused AI agent built on OpenClaw. She operates in two layers: a **project lifecycle layer** (explore, build, harvest) that helps you think through, execute, and extract value from engineering projects, and a **career layer** that accumulates achievements across projects and uses them to coach you on positioning and craft your resume.

Athena connects to actual project directories for grounding (git history, README, tech stack), while maintaining conversational context for the strategic thinking.

## Architecture

```
OpenClaw (Gateway + Discord/Telegram/WebChat)
  └── Athena Plugin (TypeScript)
        ├── Project Manager ──── lifecycle (explore → build → harvest → completed)
        ├── Project Scanner ──── reads git log, README, deps from linked directories
        ├── Decision Ledger ──── records choices + alternatives during EXPLORE
        ├── Task Tracker ─────── todos during BUILD
        ├── Harvester ─────────── extracts skills/achievements/reflections after work
        ├── Career Coach ──────── analyzes experiences through recruiter's lens
        ├── Resume Engine ────── generates + polishes resumes from real data
        ├── Resume Intake ────── multi-version resume ingestion + career evolution analysis
        ├── Resume Tailor ────── JD-targeted resume generation + ATS keyword matching
        └── SQLite (~/.athena/athena.db)
```

## Tech Stack

- **Platform:** OpenClaw (Node.js/TypeScript)
- **LLM:** Claude (Anthropic API, via OpenClaw's built-in LLM routing)
- **Storage:** Local SQLite (better-sqlite3)
- **Channels:** All OpenClaw-supported channels (Discord, Telegram, WebChat, etc.)

## Two-Layer Model

### Layer 1: Project Lifecycle

Each project moves through sequential phases. Phase transitions are explicit.

| Phase | Athena's Role | Key Tools |
|-------|---------------|-----------|
| **EXPLORE** | Discuss approaches, evaluate trade-offs, challenge assumptions. Records key decisions with alternatives and reasoning. | `project_scan`, `decision_record` |
| **BUILD** | Locks in the path. Creates structured todos, tracks progress, helps with implementation. Reads codebase for context. | `todo_add`, `todo_update`, `project_scan` |
| **HARVEST** | Extracts skills gained, achievements (quantified), challenges overcome, reflections. Stores in achievement bank. | `harvest` |
| **COMPLETED** | Project archived. Data feeds into career layer. | — |

### Layer 2: Career (always available)

Not tied to any project. Consumes accumulated harvest data plus manually-added past experiences.

- **Experience coaching** — discuss past roles, reframe through what hiring managers care about
- **Achievement bank** — living database of skills, accomplishments, challenges across all projects
- **Resume craft** — generate and polish resumes grounded in real data, guided by built-in knowledge base
- **Resume intake** — ingest multiple resume versions, analyze career evolution, conduct tailored interviews
- **Resume tailoring** — fetch job descriptions, extract requirements, generate JD-specific resumes with ATS optimization

## Data Model

### projects
Project lifecycle tracking with optional directory linking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT | Project name |
| description | TEXT | What it is |
| directory | TEXT | Absolute path to project directory (nullable) |
| phase | TEXT | `explore`, `build`, `harvest`, `completed` |
| created_at | TEXT | ISO datetime |
| updated_at | TEXT | ISO datetime |

### sessions
Conversation threads, scoped to a project or career mode.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT FK | References projects (NULL = career mode) |
| phase | TEXT | Phase at time of session (or `career`) |
| created_at | TEXT | ISO datetime |
| updated_at | TEXT | ISO datetime |
| summary | TEXT | AI-generated session summary |

### messages
Conversation history within sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| session_id | TEXT FK | References sessions |
| role | TEXT | `user` or `assistant` |
| content | TEXT | Message text |
| created_at | TEXT | ISO datetime |
| is_deleted | INTEGER | Soft delete flag |

### decisions
Key choices recorded during EXPLORE phase.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT FK | References projects |
| title | TEXT | What was decided |
| chosen | TEXT | The approach chosen |
| alternatives | TEXT (JSON) | Other options considered with trade-offs |
| reasoning | TEXT | Why this choice |
| created_at | TEXT | ISO datetime |

### todos
Tasks during BUILD phase.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT FK | References projects |
| title | TEXT | Task description |
| status | TEXT | `pending`, `in_progress`, `done` |
| priority | INTEGER | 1-3 (1=high) |
| created_at | TEXT | ISO datetime |
| completed_at | TEXT | ISO datetime (nullable) |

### achievements
The achievement bank — accumulated from harvests and manual entries.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT FK | NULL for manually-added past experiences |
| category | TEXT | `skill`, `achievement`, `challenge`, `reflection` |
| title | TEXT | Short label |
| description | TEXT | Full description, recruiter-ready language |
| evidence | TEXT (JSON) | Links to commits, files, decisions |
| tags | TEXT (JSON) | Tech stack tags, e.g. `["TypeScript", "SQLite"]` |
| created_at | TEXT | ISO datetime |

### experiences
Past work experiences for career coaching and resume generation.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| company | TEXT | Company name |
| role | TEXT | Job title |
| period | TEXT | e.g. "2024-01 to 2025-06" |
| description | TEXT | What you did |
| highlights | TEXT (JSON) | Key accomplishments |
| recruiter_insights | TEXT (JSON) | What Athena identifies as real selling points |
| created_at | TEXT | ISO datetime |
| updated_at | TEXT | ISO datetime |

### resumes
Ingested resume versions for cross-version analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| filename | TEXT | Original filename |
| version_label | TEXT | User label, e.g. "SWE March 2025" (nullable) |
| content | TEXT | Full text content of the resume |
| ingested_at | TEXT | ISO datetime |

### job_descriptions
Fetched job descriptions with extracted requirements.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| url | TEXT | Source URL of the job posting |
| raw_text | TEXT | Extracted plain text from the page |
| analysis | TEXT | Structured analysis of requirements (nullable) |
| fetched_at | TEXT | ISO datetime |

## Tools (23)

### Project Tools (5)

| # | Tool | Description |
|---|------|-------------|
| 1 | `athena_project_create` | Create a new project with name, description, optional directory path |
| 2 | `athena_project_list` | List all projects grouped by phase |
| 3 | `athena_project_open` | Switch active project (or enter career mode with no project) |
| 4 | `athena_project_advance` | Advance project to next phase |
| 5 | `athena_project_scan` | Scan linked directory — git log, README, package.json, tech stack, file structure |

### Build Tools (4)

| # | Tool | Description |
|---|------|-------------|
| 6 | `athena_decision_record` | Record a decision with chosen approach, alternatives, reasoning |
| 7 | `athena_todo_add` | Add a todo item to active project |
| 8 | `athena_todo_update` | Update todo status |
| 9 | `athena_todo_list` | List todos for active project |

### Career Tools (5)

| # | Tool | Description |
|---|------|-------------|
| 10 | `athena_harvest` | Extract skills/achievements/challenges/reflections from a project |
| 11 | `athena_achievement_list` | Query the achievement bank (filter by project, category, tags) |
| 12 | `athena_experience_add` | Add a past work experience |
| 13 | `athena_resume_generate` | Generate a resume from achievements + experiences |
| 14 | `athena_resume_review` | Review and polish a resume against best practices |

### Resume Intake Tools (4)

| # | Tool | Description |
|---|------|-------------|
| 15 | `athena_resume_ingest` | Read resume files (.txt, .md, .pdf) from a path and store them |
| 16 | `athena_resume_intake_list` | List ingested resumes with metadata |
| 17 | `athena_resume_intake_analyze` | Load all resume contents for cross-version analysis |
| 18 | `athena_resume_intake_clear` | Clear all ingested resumes |

### Resume Tailor Tools (5)

| # | Tool | Description |
|---|------|-------------|
| 19 | `athena_jd_fetch` | Fetch a job description from URL and extract text |
| 20 | `athena_jd_save_analysis` | Save structured analysis of JD requirements |
| 21 | `athena_resume_tailor` | Generate a resume tailored to a specific JD |
| 22 | `athena_resume_ats_check` | Check resume against JD for ATS keyword match |
| 23 | `athena_jd_list` | List previously fetched job descriptions |

## Persona

### Core Style
- **Strategic** — thinks in terms of outcomes, trade-offs, and positioning
- **Direct** — no filler, no hand-holding. Weak approaches get called out with explanation
- **Dual perspective** — senior engineer during project work, hiring manager during career work
- **Evidence-grounded** — references actual code, git history, and decisions
- **Recruiter-literate** — understands what job postings actually mean and whether your experience qualifies

### Phase-Specific Behavior
- **EXPLORE**: Asks pointed questions to force clarity. Challenges vague requirements. Records decisions.
- **BUILD**: Focused, execution-oriented. Breaks work into concrete tasks. Reads codebase for context.
- **HARVEST**: Thoughtful interviewer mode. Extracts the story behind the code.
- **CAREER**: Thinks like the person reading your resume. Calls out weak bullet points.

### Emotional Calibration
- Professional warmth, not therapeutic
- Celebrates real wins without inflating them
- Honest about gaps — frames them as addressable, not as problems

## Resume Knowledge Base

Built into workspace as RESUME_KNOWLEDGE.md:

- **Structure**: 1 page for <5 years, 2 max. Education at bottom unless top-5 school.
- **Bullet format**: Impact verb → what you did → measurable result.
- **Recruiter scanning**: Tech stack keywords matching JD, scope indicators, progression signals.
- **Common mistakes**: Responsibilities vs achievements, vague language, no quantification.
- **Framing strategies**: Side projects as experience, early-career positioning, gap handling.

## Project Structure

```
athena/
├── install.sh
├── README.md
├── workspace/
│   ├── SOUL.md                 # Strategic career engineer persona
│   ├── AGENTS.md               # Operating instructions + tool usage
│   ├── IDENTITY.md             # Name and tagline
│   ├── USER.md                 # User customization
│   └── RESUME_KNOWLEDGE.md     # Resume best practices knowledge base
├── plugin/
│   ├── openclaw.plugin.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── openclaw.plugin.json
│   │   ├── db/
│   │   │   ├── schema.sql       # Raw SQL schema (9 tables)
│   │   │   ├── database.ts      # AthenaDB class
│   │   │   └── __tests__/
│   │   ├── projects/
│   │   │   ├── manager.ts       # Project lifecycle + scanning
│   │   │   └── __tests__/
│   │   ├── career/
│   │   │   ├── harvester.ts     # Achievement extraction
│   │   │   ├── coach.ts         # Experience analysis
│   │   │   ├── resume.ts        # Resume generation + review
│   │   │   ├── intake.ts        # Multi-version resume ingestion
│   │   │   ├── tailor.ts        # JD-targeted resume tailoring + ATS
│   │   │   └── __tests__/
│   │   ├── tools/
│   │   │   ├── register.ts      # Registers all 23 tools
│   │   │   ├── project-tools.ts # 5 project tools
│   │   │   ├── build-tools.ts   # 4 build tools
│   │   │   ├── career-tools.ts  # 14 career tools
│   │   │   ├── helpers.ts       # MCP result helpers
│   │   │   └── __tests__/
│   │   └── skills/
│   │       ├── project/SKILL.md  # /project slash command
│   │       ├── harvest/SKILL.md  # /harvest slash command
│   │       ├── resume/SKILL.md   # /resume slash command
│   │       ├── intake/SKILL.md   # /intake slash command
│   │       └── tailor/SKILL.md   # /tailor slash command
│   └── dist/                     # Compiled JS output
└── docs/
    └── plans/
```

## Boundaries

- Does NOT replace Sophon — no philosophy, no emotional exploration, no Socratic mode
- Does NOT modify codebases — reads for context only
- Does NOT apply to jobs — prepares you to apply yourself
