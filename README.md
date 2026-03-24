# OLYMPUS

Autonomous career intelligence system. Four AI agents coordinate through Discord to automate the full career pipeline — from job discovery to interview preparation.

```
Job posted                          You get
on career page                      the interview
     │                                   │
     ▼                                   ▼
  ARTEMIS ──► ATHENA ──► ARTEMIS ──► HERMES
  discovers    tailors    applies     prepares
  & scores     resume     & tracks    mock
  the job      + cover    response    interviews
               letter
                     ▲
                     │
                 ABSOLUTE
                orchestrates
                everything
```

Built on [OpenClaw](https://openclaw.ai). All agents are TypeScript plugins backed by Obsidian vault storage.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/GravesXX/Olympus.git
cd Olympus

# 2. Install everything (agents, dependencies, Playwright)
./install.sh

# 3. Configure OpenClaw with your Discord bot tokens
node scripts/configure-openclaw.js

# 4. Start
openclaw start
```

---

## Architecture

```
                         ┌─────────────────────┐
                         │     ABSOLUTE         │
                         │   The Orchestrator   │
                         │   16 tools           │
                         └───┬─────┬────────┬───┘
                             │     │        │
              ┌──────────────┘     │        └──────────────┐
              │                    │                       │
   ┌──────────▼────────┐ ┌────────▼─────────┐ ┌───────────▼──────┐
   │      ATHENA        │ │     HERMES        │ │     ARTEMIS       │
   │  The Strategist    │ │   The Herald      │ │   The Huntress    │
   │  20 tools          │ │   14 tools        │ │   24 tools        │
   │                    │ │                   │ │                   │
   │ Resume tailoring   │ │ Mock interviews   │ │ Daily job scan    │
   │ Achievement bank   │ │ 7-dim scoring     │ │ Confidence score  │
   │ Cover letters      │ │ Targeted drills   │ │ Auto-fill forms   │
   │ ATS optimization   │ │ Performance track │ │ Email monitoring  │
   │ Soft skills KB     │ │                   │ │ Application track │
   └────────────────────┘ └───────────────────┘ └───────────────────┘
```

## The Pipeline

```
  ARTEMIS                ATHENA               ARTEMIS              HERMES
  ───────                ──────               ───────              ──────

  Scans 12 companies     Tailors resume       Auto-fills form      Ingests JD
  via APIs + Playwright  from achievement     via Playwright       Researches company
        │                bank + JD                 │               Plans mock rounds
        ▼                     │                    ▼               Scores 7 dimensions
  Filters by:                 ▼               Screenshots form     Drills weak areas
  - Ontario/Canada       Generates cover      for your review
  - Engineer/Developer   letter from soft          │
  - Junior-Senior        skills KB                 ▼
        │                     │               You: "Approve"
        ▼                     │                    │
  Scores (4 dimensions)       │                    ▼
  Skills   40%                │               Submits application
  Level    25%                │               Monitors email
  Domain   20%                │               DMs you for
  Years    15%                │               interviews/offers
        │                     │
        ▼                     │
  Posts to Discord             │
  #daily-job-report            │
        │                     │
        ▼                     │
  You: "Apply to #3" ────────►│
```

## Agents

### Absolute — The Orchestrator
Coordinates multi-agent tasks. Plans, delegates, reviews, synthesizes.
- 7-phase protocol: Plan → Checkpoint → Consult → Delegate → Monitor → Review → Synthesize
- 16 MCP tools

### Athena — The Strategist
Career intelligence engine. Tracks projects, extracts achievements, tailors resumes, generates cover letters.
- ATS keyword optimization targeting 80%+ match rate
- Soft skills knowledge base built from cover letters and reflections
- 20 MCP tools

### Hermes — The Herald
Interview preparation coach. Runs realistic mock interviews, scores across 7 dimensions, targets weaknesses.
- Dual mode: Interviewer (neutral) vs Coach (direct feedback)
- 14 MCP tools

### Artemis — The Huntress
Automated job hunter. Scrapes career pages daily, scores matches, fills applications, monitors responses.
- API fetchers: Greenhouse, Lever, Ashby, Amazon, Uber, AMD
- Playwright scrapers: Google, Apple, Microsoft, Meta, IBM
- 24 MCP tools

## Project Structure

```
Olympus/
├── agents/
│   ├── absolute/           # Orchestrator agent
│   │   ├── plugin/src/     # TypeScript source
│   │   └── workspace/      # SOUL.md, AGENTS.md, etc.
│   ├── athena/             # Career engine agent
│   │   ├── plugin/src/
│   │   └── workspace/
│   ├── hermes/             # Interview coach agent
│   │   ├── plugin/src/
│   │   └── workspace/
│   └── artemis/            # Job hunter agent
│       ├── plugin/src/
│       ├── workspace/
│       └── scripts/        # Seed companies, setup email, etc.
├── shared/
│   └── obsidian-adapter/   # Shared Obsidian vault storage adapter
├── scripts/
│   └── configure-openclaw.js   # Interactive OpenClaw config generator
├── install.sh              # One-command setup
└── README.md
```

## Setup Guide

### Prerequisites

- macOS (launchd scheduling, Keychain integration)
- Node.js 20+
- [OpenClaw](https://openclaw.ai) installed
- Discord server with admin access
- Obsidian vault at `~/Documents/Obsidian Vault/`

### Step 1: Install

```bash
git clone https://github.com/GravesXX/Olympus.git
cd Olympus
./install.sh
```

This installs all dependencies, Playwright browsers, verifies TypeScript compilation, runs all tests, and creates local directories.

### Step 2: Create Discord Bots

Go to [Discord Developer Portal](https://discord.com/developers/applications):

1. Create 4 applications: **Absolute**, **Athena**, **Hermes**, **Artemis**
2. For each: Bot → **Reset Token** → copy the token
3. For each: Bot → enable **MESSAGE CONTENT INTENT**
4. For each: OAuth2 → URL Generator → select `bot` scope → select permissions: Send Messages, Read Messages, Attach Files, Use Slash Commands → copy invite URL → add to your server

### Step 3: Create Discord Channels

In your server, create:
- `#athena` — dedicated career work
- `#daily-job-report` — Artemis posts daily reports here

### Step 4: Configure OpenClaw

```bash
node scripts/configure-openclaw.js
```

This interactive script asks for your bot tokens, server ID, and channel IDs, then generates the `~/.openclaw/openclaw.json` config.

### Step 5: Configure Artemis Email

Create a dedicated Gmail for job applications, then:

```bash
cd agents/artemis/plugin
npx tsx ../scripts/setup-email.ts your-email@gmail.com "your-app-password" gmail
```

For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification enabled).

### Step 6: Add Companies

```bash
cd agents/artemis/plugin
npx tsx ../scripts/seed-companies.ts
```

This adds a default set of tech companies. Edit the script to customize.

### Step 7: Start

```bash
openclaw start
```

All 4 agents come online in Discord. Artemis runs daily at 9 AM ET automatically.

## Infrastructure

| Layer | Technology |
|-------|-----------|
| Runtime | OpenClaw (TypeScript plugins) |
| LLM | Claude via Anthropic API |
| Database | Obsidian Vault (markdown + YAML frontmatter) |
| Storage | obsidian-adapter (shared library) |
| Browser | Playwright (scraping + form filling) |
| Email | IMAP via imapflow |
| Communication | Discord bot mentions |
| Scheduling | macOS launchd |
| Encryption | AES-256-GCM |

## Design Principles

1. **One human touchpoint** — approve before submit. Everything else is autonomous.
2. **Agent isolation** — each agent has its own plugin, workspace, and database partition. No shared state beyond Discord.
3. **Discord as message bus** — agents communicate via mentions. Adding an agent = adding it to Discord.
4. **Obsidian as database** — all data visible and editable in the Obsidian UI.
5. **API-first scraping** — use JSON APIs when available, Playwright as fallback.

## Development

```bash
# Run tests for a specific agent
cd agents/artemis/plugin && npm test

# Type check
cd agents/artemis/plugin && npx tsc --noEmit

# Watch mode
cd agents/artemis/plugin && npm run test:watch

# Manual scan (Artemis)
cd agents/artemis/plugin && npx tsx ../scripts/test-scan.ts
```

## Stats

| Metric | Count |
|--------|-------|
| Agents | 4 |
| Total MCP tools | 74 |
| Companies tracked | 12 |
| Daily jobs scanned | ~1,200 |
| Tests | 163+ |

---

*"The strength of the many, guided by the vision of one."*
