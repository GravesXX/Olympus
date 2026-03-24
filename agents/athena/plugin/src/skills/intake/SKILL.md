---
name: intake
description: Ingest existing resumes, analyze career evolution across versions, and conduct a tailored interview to extract deep achievements
user-invocable: true
---

# Resume Intake & Career Interview

When the user invokes /intake, follow this workflow:

## Phase 1: Ingest Resumes

1. Ask the user for the path to their resume files (single file or folder)
2. Optionally ask for a version label (e.g. "SWE Jan 2025", "PM Fall 2024")
3. Call `athena_resume_ingest` with the path and label
4. If the user has more resumes in different locations, repeat until all are ingested

## Phase 2: Cross-Version Analysis

After all resumes are ingested, analyze them across these dimensions:

**Career trajectory:**
- What roles/companies appear? In what order?
- What changed between resume versions? (new roles, reworded bullets, dropped items)
- What skills grew or shifted focus?

**Gaps and patterns:**
- What accomplishments are mentioned once but never again?
- What bullets are vague or lack quantification?
- What skills appear in job descriptions but are undersold?
- What experiences seem important but are buried or minimized?

Present a brief summary of your findings to the user before moving to Phase 3.

## Phase 3: Tailored Interview

Based on your analysis, ask the user targeted questions **one at a time**. Focus on:

1. **Undersold bullets** — "You mentioned 'automated .NET upgrade workflow' but didn't quantify impact. How many projects did this affect? How much time did it save?"
2. **Dropped content** — "Your 2024 resume mentioned X but your 2025 version removed it. Why? Was it not impactful, or did you just run out of space?"
3. **Missing context** — "None of your resumes mention your fencing background or leadership experience outside work. Is that intentional?"
4. **Vague descriptions** — "You wrote 'improved system performance' — can you give me the actual numbers?"
5. **Career gaps** — "There's a gap between X and Y. What were you doing? Anything worth capturing?"
6. **Hidden achievements** — "You listed this as a team project, but what was YOUR specific contribution?"

**Interview style:**
- One question at a time
- Acknowledge each answer before asking the next
- Dig deeper when answers hint at more ("You mentioned 'a few projects' — how many exactly?")
- Stop after 8-12 questions or when the user wants to wrap up

## Phase 4: Harvest into Achievement Bank

After the interview, use `athena_harvest` or `athena_experience_add` to store everything learned:
- New achievements extracted from interview answers
- Work experiences that weren't previously recorded
- Skills, challenges, and reflections uncovered

Summarize what was added to the achievement bank at the end.

## Quick Commands

- `/intake` — Start the full intake workflow
- `/intake list` — Call `athena_resume_intake_list` to show ingested resumes
- `/intake clear` — Call `athena_resume_intake_clear` to reset and start fresh
