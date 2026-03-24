# Athena

A strategic career engineer agent built on [OpenClaw](https://openclaw.ai).

Athena helps you think through engineering projects, execute them, extract career value from your work, and craft a resume that actually represents what you've built. She connects to your real codebases for grounding and accumulates achievements across all your projects.

## Two Layers

### Project Lifecycle
Every project moves through four phases:

| Phase | What Athena Does |
|-------|------------------|
| **EXPLORE** | Discuss approaches, evaluate trade-offs, record key decisions |
| **BUILD** | Create tasks, track progress, scan your codebase for context |
| **HARVEST** | Extract skills, achievements, challenges, reflections |
| **COMPLETED** | Archived. Data feeds into your career profile. |

### Career (always available)
- Add past work experiences
- Query your achievement bank across all projects
- Ingest multiple resume versions and analyze career evolution
- Generate resumes from real data
- Tailor resumes to specific job descriptions with ATS optimization
- Review and polish resumes against best practices

## Requirements

- [OpenClaw](https://openclaw.ai) installed and configured
- Node.js >= 22

## Installation

```bash
git clone <this-repo> ~/Desktop/athena
cd ~/Desktop/athena
bash install.sh
```

Then add to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/athena/plugin/src/index.ts"]
    },
    "allow": ["athena"],
    "entries": {
      "athena": { "enabled": true }
    }
  }
}
```

## Slash Commands

| Command | What it does |
|---------|-------------|
| `/project new <name>` | Start tracking a new project |
| `/project list` | Show all projects by phase |
| `/project open <query>` | Switch to a project |
| `/project advance` | Move project to next phase |
| `/project scan` | Scan linked directory for context |
| `/harvest` | Extract achievements from current project |
| `/resume generate` | Generate a resume from your data |
| `/resume review` | Review an existing resume |
| `/intake` | Ingest resumes, analyze career evolution, conduct interview |
| `/intake list` | Show ingested resumes |
| `/intake clear` | Clear resume bank |
| `/tailor` | Fetch a JD, generate tailored resume, run ATS check |
| `/tailor list` | Show previously fetched job descriptions |

## Tools (23)

### Project Tools (5)

| Tool | Purpose |
|------|---------|
| `athena_project_create` | Create a new project |
| `athena_project_list` | List projects by phase |
| `athena_project_open` | Open a project by name |
| `athena_project_advance` | Advance project phase |
| `athena_project_scan` | Scan linked directory |

### Build Tools (4)

| Tool | Purpose |
|------|---------|
| `athena_decision_record` | Record a decision with alternatives |
| `athena_todo_add` | Add a task |
| `athena_todo_update` | Update task status |
| `athena_todo_list` | List tasks with progress |

### Career Tools (5)

| Tool | Purpose |
|------|---------|
| `athena_harvest` | Extract achievements from a project |
| `athena_achievement_list` | Query the achievement bank |
| `athena_experience_add` | Add a past work experience |
| `athena_resume_generate` | Generate resume from real data |
| `athena_resume_review` | Review resume against best practices |

### Resume Intake Tools (4)

| Tool | Purpose |
|------|---------|
| `athena_resume_ingest` | Read resume files (.txt, .md, .pdf) and store them |
| `athena_resume_intake_list` | List ingested resumes with metadata |
| `athena_resume_intake_analyze` | Load all resume contents for cross-version analysis |
| `athena_resume_intake_clear` | Clear all ingested resumes |

### Resume Tailor Tools (5)

| Tool | Purpose |
|------|---------|
| `athena_jd_fetch` | Fetch a job description from URL and extract text |
| `athena_jd_save_analysis` | Save structured analysis of JD requirements |
| `athena_resume_tailor` | Generate a resume tailored to a specific JD |
| `athena_resume_ats_check` | Check resume against JD for ATS keyword match |
| `athena_jd_list` | List previously fetched job descriptions |

## Database

Local SQLite at `~/.athena/athena.db` with 9 tables:

| Table | Purpose |
|-------|---------|
| `projects` | Project lifecycle (explore → build → harvest → completed) |
| `sessions` | Conversation threads scoped to project or career mode |
| `messages` | Chat history within sessions |
| `decisions` | Key choices recorded during EXPLORE |
| `todos` | Tasks during BUILD |
| `achievements` | Achievement bank (skills, achievements, challenges, reflections) |
| `experiences` | Past work experiences |
| `resumes` | Ingested resume versions for cross-version analysis |
| `job_descriptions` | Fetched JDs with extracted requirements |

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
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── openclaw.plugin.json
│   │   ├── db/
│   │   │   ├── schema.sql       # Raw SQL schema
│   │   │   ├── database.ts      # AthenaDB class (9 tables)
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

## Development

```bash
cd plugin
npm install
npm test              # run all tests (5 suites, 39 tests)
npm run test:watch    # watch mode
npm run build         # compile TypeScript
```

## Data Privacy

All data stored locally in `~/.athena/athena.db`. Nothing leaves your machine except API calls to Claude.
