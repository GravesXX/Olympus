import { AthenaDB } from '../db/database.js';

const RESUME_KNOWLEDGE = `## Resume Best Practices for Tech Engineers

### Structure
- 1 page for <5 years experience, 2 pages max otherwise
- Order: Contact → Summary (optional) → Experience → Projects → Skills → Education
- Education goes at bottom unless top-5 CS program

### Bullet Format
- Lead with impact verb → what you did → measurable result
- GOOD: "Reduced API latency 40% by implementing Redis caching layer across 3 microservices"
- BAD: "Worked on backend performance improvements"
- GOOD: "Built real-time dashboard serving 500 daily users using React and WebSocket"
- BAD: "Helped with frontend development"

### What Recruiters Scan For (in order)
1. Tech stack keywords matching the job description
2. Scope indicators: team size, user count, request volume, data scale
3. Progression signals: increasing responsibility, promotions, ownership
4. Impact metrics: percentages, dollar amounts, time savings
5. System design signals: distributed systems, scale, reliability

### Common Mistakes
- Listing responsibilities instead of achievements
- Vague language: "helped with", "assisted in", "participated in", "worked on"
- No quantification — every bullet should have a number if possible
- Burying strongest work under weaker entries
- Including irrelevant experience at the expense of relevant projects

### Framing Strategies
- Side projects ARE real experience if they demonstrate real skills
- Early-career: emphasize learning velocity, scope of ownership, and technical depth
- Career gaps: address briefly if asked, don't over-explain on resume
- Generalist → specialist: highlight the thread that connects your experience`;

const GENERATE_SYSTEM_PROMPT = `You are an expert tech resume writer. Generate a polished, ATS-friendly resume using the provided achievement bank and work experiences.

${RESUME_KNOWLEDGE}

Output the resume in clean markdown format. Every bullet point should follow the impact verb → action → result pattern. Prioritize the strongest achievements. Quantify everything possible.`;

const REVIEW_SYSTEM_PROMPT = `You are an expert tech resume reviewer. Analyze the provided resume and give specific, actionable feedback.

${RESUME_KNOWLEDGE}

For each bullet point, rate it as STRONG, OK, or WEAK with a specific suggestion. Flag common mistakes. Suggest rewritten versions for weak bullets using data from the achievement bank when available.`;

export class ResumeEngine {
  constructor(private db: AthenaDB) {}

  buildGeneratePrompt(): string {
    const achievements = this.db.getAllAchievements();
    const experiences = this.db.getAllExperiences();

    const sections: string[] = [GENERATE_SYSTEM_PROMPT, '', '--- Data ---', ''];

    if (achievements.length > 0) {
      sections.push('## Achievement Bank');
      for (const a of achievements) {
        let tags = '';
        try { const parsed = JSON.parse(a.tags); if (parsed.length) tags = ` [${parsed.join(', ')}]`; } catch {}
        sections.push(`- [${a.category}] **${a.title}**: ${a.description}${tags}`);
      }
      sections.push('');
    }

    if (experiences.length > 0) {
      sections.push('## Work Experience');
      for (const exp of experiences) {
        sections.push(`### ${exp.role} at ${exp.company} (${exp.period})`);
        sections.push(exp.description);
        try { const highlights = JSON.parse(exp.highlights); for (const h of highlights) sections.push(`- ${h}`); } catch {}
        sections.push('');
      }
    }

    sections.push('Generate the resume now.');
    return sections.join('\n');
  }

  buildReviewPrompt(resumeText: string): string {
    const achievements = this.db.getAllAchievements();

    const sections: string[] = [REVIEW_SYSTEM_PROMPT, '', '--- Resume to Review ---', '', resumeText, ''];

    if (achievements.length > 0) {
      sections.push('--- Achievement Bank (for comparison) ---');
      for (const a of achievements) {
        let tags = '';
        try { const parsed = JSON.parse(a.tags); if (parsed.length) tags = ` [${parsed.join(', ')}]`; } catch {}
        sections.push(`- [${a.category}] **${a.title}**: ${a.description}${tags}`);
      }
    }

    sections.push('');
    sections.push('Review this resume and provide specific feedback.');
    return sections.join('\n');
  }
}
