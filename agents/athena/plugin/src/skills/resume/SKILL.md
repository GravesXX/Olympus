---
name: resume
description: Generate or review a resume using your achievement bank and work experiences
user-invocable: true
---

# Resume Generation & Review

When the user invokes /resume, determine the subcommand:

- `/resume generate` → Call `athena_resume_generate` to get the generation prompt, then produce the resume
- `/resume review` → Ask the user to paste their current resume, then call `athena_resume_review`
- `/resume` (no subcommand) → Ask whether they want to generate a new resume or review an existing one

## Related Commands

- `/intake` — Ingest existing resumes for cross-version analysis and career interviewing
- `/tailor` — Generate a resume tailored to a specific job description with ATS optimization
