# OLYMPUS

An autonomous career intelligence system built on [OpenClaw](https://openclaw.ai). Four AI agents coordinate through Discord to automate the full career pipeline — from job discovery to interview preparation.

Built by Isaac Xia.

---

## Architecture

```
                              ┌─────────────────────────┐
                              │       ABSOLUTE           │
                              │    The Orchestrator      │
                              │                         │
                              │  Plans · Delegates       │
                              │  Reviews · Synthesizes   │
                              └────────┬────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                  │
          ┌──────────▼───────┐ ┌───────▼────────┐ ┌──────▼─────────┐
          │     ATHENA       │ │    HERMES       │ │    ARTEMIS     │
          │  The Strategist  │ │   The Herald    │ │  The Huntress  │
          │                  │ │                 │ │                │
          │ Resume tailoring │ │ Mock interviews │ │ Daily job scan │
          │ Achievement bank │ │ 7-dim scoring   │ │ Career page    │
          │ Cover letters    │ │ Drill coaching  │ │   APIs         │
          │ Soft skills KB   │ │ Performance     │ │ Confidence     │
          │ ATS optimization │ │ tracking        │ │   scoring      │
          └──────────▲───────┘ └───────▲────────┘ │ Auto-fill      │
                     │                 │          │   forms        │
                     │                 │          │ Email monitor  │
                     └─────────┬───────┘          │ Application    │
                               │                  │   tracking     │
                    ┌──────────┴──┐               └───────┬────────┘
                    │  OBSIDIAN   │                        │
                    │  VAULT      │    9:00 AM ET ─────────┘
                    │             │         │
                    │  Shared     │         ▼
                    │  knowledge  │    Discord
                    │  base       │    #daily-job-report
                    └─────────────┘
          │     ARTEMIS      │
          │   The Huntress   │
          │                  │
          │ Daily job scan   │──── 9:00 AM ET ──── Discord #daily-job-report
          │ Career page APIs │
          │ Confidence score │
          │ Auto-fill forms  │
          │ Email monitoring │
          │ Application      │
          │ tracking         │
          └──────────────────┘
```

## The Pipeline

```
                    DAILY (automated)                         ON DEMAND (human-triggered)
                    ─────────────────                         ──────────────────────────

  ┌───────────────────────────────────────────┐
  │  ARTEMIS scans 12 company career pages    │
  │                                           │
  │  APIs:  Amazon · Stripe · Anthropic       │
  │         Vercel · Uber · AMD               │
  │         Wealthsimple · Cohere             │
  │                                           │
  │  Playwright: Google · Apple               │
  │         Microsoft · Meta · IBM            │
  └─────────────────┬─────────────────────────┘
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  FILTER                                   │
  │  Location: Ontario / Canada / Remote-CA   │
  │  Title: engineer / developer / SWE / SDE  │
  │  Level: junior → senior (no staff+)       │
  └─────────────────┬─────────────────────────┘
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  SCORE (4 dimensions)                     │
  │  Skills match    40%                      │
  │  Level match     25%                      │
  │  Domain          20%                      │
  │  Experience      15%                      │
  └─────────────────┬─────────────────────────┘
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  REPORT → Discord #daily-job-report       │
  │                                           │
  │  Strong (80+) · Moderate (60-79)          │
  │  Title · Company · Salary · Location      │
  │  Score · Requirements · Link              │
  └─────────────────┬─────────────────────────┘
                    │
              Isaac reviews
                    │
              "Apply to #3"
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  ATHENA tailors resume + cover letter     │
  │                                           │
  │  Achievement bank → JD keyword matching   │
  │  Soft skills KB → cover letter narrative  │
  │  ATS optimization → 80%+ match target    │
  └─────────────────┬─────────────────────────┘
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  ARTEMIS auto-fills application           │
  │                                           │
  │  Playwright (headed) → fill form fields   │
  │  Upload PDF resume · paste cover letter   │
  │  Answer custom questions via Claude       │
  │  Screenshot → Discord for review          │
  └─────────────────┬─────────────────────────┘
                    │
              Isaac reviews screenshot
              "Approve" or "Change X"
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  ARTEMIS submits · tracks · monitors      │
  │                                           │
  │  IMAP polling → classify responses        │
  │  ack · rejection · interview · offer      │
  │  Auto-update application status           │
  │  DM Isaac for interviews/offers           │
  └─────────────────┬─────────────────────────┘
                    │
              Interview scheduled
                    │
                    ▼
  ┌───────────────────────────────────────────┐
  │  HERMES prepares Isaac                    │
  │                                           │
  │  Ingests JD · researches company          │
  │  Plans multi-round mock interviews        │
  │  Technical · behavioral · system design   │
  │  7-dimension scoring · targeted drills    │
  │  Adapts to weak areas                     │
  └───────────────────────────────────────────┘
```

## The Agents

### Absolute — The Orchestrator
The omniscient coordinator. Sees all threads, delegates to the right specialist, ensures quality at every step. Named after the commanding deity from Baldur's Gate 3.
- 16 tools: plan/task management, consultation, quality review, metrics
- 7-phase protocol: Plan → Checkpoint → Consult → Delegate → Monitor → Review → Synthesize
- [github.com/GravesXX/absolute](https://github.com/GravesXX/absolute)

### Athena — The Strategist
Career intelligence engine. Tracks projects through their lifecycle, extracts achievements, tailors resumes to specific JDs with ATS optimization, generates cover letters informed by a soft skills knowledge base.
- 20 tools: project lifecycle, achievements, resume tailoring, ATS check, cover letters, soft skills
- 11 database entities in Obsidian vault
- [github.com/GravesXX/Athena](https://github.com/GravesXX/Athena)

### Hermes — The Herald
Interview preparation coach. Simulates realistic interviews with a senior recruiter persona, scores performance across 7 dimensions, identifies weaknesses, and runs targeted drills.
- 14 tools: JD analysis, session planning, round conducting, evaluation, performance tracking
- Modes: Interviewer (neutral, no hints) vs Coach (direct, honest feedback)
- [github.com/GravesXX/Hermes](https://github.com/GravesXX/Hermes)

### Artemis — The Huntress
Automated job hunter. Scrapes career pages daily, scores jobs against the user profile, posts Discord reports, auto-fills applications with browser automation, monitors email for responses.
- 24 tools: company pool, scanning, reporting, application, tracking, email, credentials
- Fetches from Greenhouse/Lever/Ashby APIs + company-specific APIs (Amazon, Uber, AMD) + Playwright
- [github.com/GravesXX/Artemis](https://github.com/GravesXX/Artemis)

## Infrastructure

| Layer | Technology |
|-------|-----------|
| Runtime | OpenClaw (all agents as TypeScript plugins) |
| LLM | Claude (Anthropic API via OpenClaw) |
| Database | Obsidian Vault (markdown + YAML frontmatter) |
| Storage adapter | obsidian-adapter (shared across all agents) |
| Browser automation | Playwright |
| Email monitoring | IMAP (imapflow) |
| Inter-agent comms | Discord bot mentions |
| Scheduling | macOS launchd (9 AM ET daily) |
| Encryption | AES-256-GCM (macOS Keychain-derived key) |

## Discord Channels

| Channel | Purpose |
|---------|---------|
| `#general` | All agents respond when mentioned |
| `#athena` | Dedicated Athena career work |
| `#daily-job-report` | Artemis daily reports + application reviews |

## Design Principles

1. **One human touchpoint** — Isaac approves before any application is submitted. Everything else is autonomous.
2. **Agent isolation** — Each agent is a self-contained plugin with its own repo, workspace, and database. No shared state beyond Discord messages.
3. **Discord as message bus** — Agents communicate via Discord mentions. Adding a new agent = adding it to Discord, not rewiring infrastructure.
4. **Obsidian as database** — All data visible and editable through the Obsidian UI. No hidden state.
5. **API-first scraping** — Use JSON APIs (Greenhouse, Lever, Ashby, Amazon) when available. Fall back to Playwright only when necessary.

## Stats

| Metric | Count |
|--------|-------|
| Agents | 4 |
| Total MCP tools | 74 |
| Database entities | 30+ |
| Companies tracked | 12 |
| Daily jobs scanned | ~1,200 |
| Tests passing | 163 (Artemis) + agent-specific |

---

*"The strength of the many, guided by the vision of one."* — Absolute
