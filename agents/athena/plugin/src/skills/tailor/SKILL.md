---
name: tailor
description: Fetch a job description, extract requirements, generate a tailored resume, and run ATS keyword matching
user-invocable: true
---

# Resume Tailoring & ATS Optimization

When the user invokes /tailor, follow this workflow:

## Phase 1: Job Description Intake

1. Ask the user for the job posting URL
2. Call `athena_jd_fetch` with the URL
3. The tool returns the raw JD text — analyze it immediately
4. Extract: job title, company, required skills, experience level, key responsibilities, seniority signals, and industry keywords
5. Call `athena_jd_save_analysis` with the JD ID and your structured extraction

## Phase 2: Generate Tailored Resume

1. Call `athena_resume_tailor` with the JD ID
2. The tool returns a comprehensive prompt with:
   - The JD text and extracted requirements
   - Your achievement bank entries
   - Your work experience history
   - Any previously ingested resume versions
3. Generate a tailored resume that:
   - Mirrors **exact keywords** from the JD (not synonyms)
   - Prioritizes experiences most relevant to this role
   - Quantifies every bullet (numbers, percentages, scale)
   - Uses impact verb -> action -> result pattern
   - Includes a Technical Skills section matching JD terminology
   - Uses standard ATS-parseable section headers

## Phase 3: ATS Compatibility Check

1. Call `athena_resume_ats_check` with the JD ID and the generated resume text
2. Review the automated keyword analysis (match rate, missing keywords)
3. Provide a deeper review:
   - Catch semantic matches the automated scan missed
   - Identify critical missing keywords
   - Give a final adjusted match score
4. If match rate is below 75%, rewrite weak bullets to incorporate missing keywords
5. Target: **80%+ keyword match** for strong ATS pass rate

## Phase 4: Iterate

If the ATS check reveals gaps:
1. Revise the resume to address missing keywords
2. Re-run the ATS check
3. Repeat until match rate is 80%+
4. Present the final version to the user

## Quick Commands

- `/tailor` — Start the full tailoring workflow with a new JD
- `/tailor list` — Call `athena_jd_list` to show previously fetched job descriptions
- `/tailor <jd_id>` — Re-tailor for a previously analyzed JD (skip Phase 1)

## Tips

- If the URL fails to fetch (JS-rendered pages), ask the user to paste the JD text directly
- Always run the ATS check — never skip it
- When in doubt, use the JD's exact phrasing over your own wording
- Spell out acronyms at least once alongside their abbreviation
