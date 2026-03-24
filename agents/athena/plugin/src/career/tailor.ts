import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';

const TAILOR_SYSTEM_PROMPT = `You are an expert resume writer who tailors resumes to specific job descriptions. Your goal is to create a resume that:

1. **Maximizes ATS keyword match** — Mirror the exact terminology from the JD. If they say "CI/CD pipelines", use that exact phrase, not "deployment automation".
2. **Prioritizes relevant experience** — Lead with achievements that directly map to JD requirements. Deprioritize unrelated work.
3. **Quantifies everything** — Every bullet should have a number: users served, latency reduced, time saved, team size, revenue impact.
4. **Follows the impact verb → action → result pattern** — "Reduced API latency 40% by implementing Redis caching layer across 3 microservices"
5. **Matches seniority signals** — If JD asks for senior, emphasize leadership, mentorship, architecture decisions. If mid-level, emphasize execution speed and learning velocity.

## ATS Optimization Rules
- Use standard section headers: "Experience", "Skills", "Education", "Projects"
- No tables, columns, or fancy formatting — plain text/markdown
- Include a "Technical Skills" section that mirrors JD keywords exactly
- Spell out acronyms at least once: "Continuous Integration/Continuous Deployment (CI/CD)"
- Use both the acronym AND full form of technologies when space allows
- Match job title keywords in your experience descriptions
- Include industry-specific terminology from the JD verbatim`;

const ATS_CHECK_PROMPT = `You are an ATS (Applicant Tracking System) compatibility analyzer. Compare the resume against the job description and provide:

1. **Keyword Match Score** — What percentage of JD keywords appear in the resume?
2. **Missing Keywords** — Critical JD terms not found in the resume
3. **Keyword Density** — Are key terms used enough times to rank well?
4. **Section Analysis** — Does the resume have all standard ATS-parseable sections?
5. **Red Flags** — Formatting issues, missing dates, unusual section names that confuse ATS
6. **Recommendations** — Specific changes to improve match rate

Be precise with the match score. List every missing keyword.`;

export class ResumeTailor {
  constructor(private db: AthenaDB) {}

  async fetchJobDescription(url: string): Promise<ToolResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return { content: '', error: `Failed to fetch URL: ${response.status} ${response.statusText}` };
      }

      const html = await response.text();
      const text = this.htmlToText(html);

      if (!text.trim()) {
        return { content: '', error: 'Page returned empty content. The job posting may require JavaScript rendering.' };
      }

      // Store the JD
      const jd = this.db.addJobDescription(url, text);

      const sections: string[] = [
        `Job description fetched and stored (ID: ${jd.id}).`,
        '',
        '---',
        '',
        text,
        '',
        '---',
        '',
        'Now analyze this job description. Extract:',
        '1. **Job title and company**',
        '2. **Required skills** (list each technology/tool/framework)',
        '3. **Required experience** (years, specific domains)',
        '4. **Preferred/nice-to-have skills**',
        '5. **Key responsibilities** (what the role does day-to-day)',
        '6. **Seniority signals** (junior/mid/senior/lead indicators)',
        '7. **Industry keywords** (exact terminology to mirror in resume)',
        '',
        'After analyzing, call `athena_jd_save_analysis` with the JD ID and your structured extraction.',
      ];

      return { content: sections.join('\n') };
    } catch (err) {
      return { content: '', error: `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  saveAnalysis(jdId: string, analysisJson: string): ToolResult {
    this.db.updateJobDescriptionAnalysis(jdId, analysisJson);
    return { content: `Analysis saved for JD ${jdId}. Ready to tailor resume — call \`athena_resume_tailor\` with this JD ID.` };
  }

  buildTailorPrompt(jdId: string): string {
    const jd = this.db.getJobDescription(jdId);
    if (!jd) return 'Job description not found.';

    const achievements = this.db.getAllAchievements();
    const experiences = this.db.getAllExperiences();
    const resumes = this.db.getAllResumes();

    const sections: string[] = [
      TAILOR_SYSTEM_PROMPT,
      '',
      '--- Job Description ---',
      '',
      jd.raw_text,
      '',
    ];

    if (jd.analysis) {
      sections.push('--- Extracted Requirements ---', '', jd.analysis, '');
    }

    if (achievements.length > 0) {
      sections.push('--- Achievement Bank ---', '');
      for (const a of achievements) {
        let tags = '';
        try { const parsed = JSON.parse(a.tags); if (parsed.length) tags = ` [${parsed.join(', ')}]`; } catch {}
        sections.push(`- [${a.category}] **${a.title}**: ${a.description}${tags}`);
      }
      sections.push('');
    }

    if (experiences.length > 0) {
      sections.push('--- Work Experience ---', '');
      for (const exp of experiences) {
        sections.push(`### ${exp.role} at ${exp.company} (${exp.period})`);
        sections.push(exp.description);
        try { const highlights = JSON.parse(exp.highlights); for (const h of highlights) sections.push(`- ${h}`); } catch {}
        sections.push('');
      }
    }

    if (resumes.length > 0) {
      sections.push('--- Previous Resume Versions (for reference) ---', '');
      for (const r of resumes) {
        sections.push(`#### ${r.version_label || r.filename}`);
        sections.push(r.content);
        sections.push('');
      }
    }

    sections.push(
      '--- Instructions ---',
      '',
      'Generate a tailored resume that maximizes match with this specific job description.',
      'Use EXACT keywords from the JD. Prioritize experiences most relevant to this role.',
      'Output clean markdown. Include a Technical Skills section mirroring JD terminology.',
      'After generating, the user should run an ATS check to verify match quality.',
    );

    return sections.join('\n');
  }

  buildAtsCheckPrompt(jdId: string, resumeText: string): string {
    const jd = this.db.getJobDescription(jdId);
    if (!jd) return 'Job description not found.';

    // Programmatic keyword extraction and matching
    const jdWords = this.extractKeywords(jd.raw_text);
    const resumeWords = this.extractKeywords(resumeText);
    const matchedKeywords = jdWords.filter(k => resumeWords.includes(k));
    const missingKeywords = jdWords.filter(k => !resumeWords.includes(k));
    const matchRate = jdWords.length > 0 ? Math.round((matchedKeywords.length / jdWords.length) * 100) : 0;

    const sections: string[] = [
      ATS_CHECK_PROMPT,
      '',
      '--- Automated Keyword Analysis ---',
      '',
      `**Preliminary Match Rate: ${matchRate}%** (${matchedKeywords.length}/${jdWords.length} keywords)`,
      '',
      `Matched: ${matchedKeywords.join(', ') || 'none'}`,
      '',
      `Missing: ${missingKeywords.join(', ') || 'none'}`,
      '',
      '--- Job Description ---',
      '',
      jd.raw_text,
      '',
    ];

    if (jd.analysis) {
      sections.push('--- Extracted Requirements ---', '', jd.analysis, '');
    }

    sections.push(
      '--- Resume to Check ---',
      '',
      resumeText,
      '',
      '--- Instructions ---',
      '',
      'Validate the automated analysis above and provide a deeper review.',
      'Check for semantic matches the keyword scan may have missed (e.g. "REST APIs" vs "RESTful services").',
      'Give a final adjusted match score and specific recommendations to improve it.',
      `Target: 80%+ keyword match for strong ATS pass rate.`,
      '',
      'If the match rate is below 75%, suggest specific rewrites for the weakest bullets.',
    );

    return sections.join('\n');
  }

  listJobDescriptions(): ToolResult {
    const jds = this.db.getAllJobDescriptions();
    if (jds.length === 0) {
      return { content: 'No job descriptions analyzed yet. Use `/tailor` with a job posting URL.' };
    }

    const lines: string[] = [`**${jds.length} job description(s):**`, ''];
    for (const jd of jds) {
      const analyzed = jd.analysis ? 'analyzed' : 'pending analysis';
      lines.push(`- **${jd.id.slice(0, 8)}** — ${jd.url} (${analyzed}, fetched ${jd.fetched_at})`);
    }
    return { content: lines.join('\n') };
  }

  private htmlToText(html: string): string {
    return html
      // Remove script and style blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Convert common block elements to newlines
      .replace(/<\/?(p|div|br|h[1-6]|li|tr|section|article|header|footer)[^>]*>/gi, '\n')
      // Remove all remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x2F;/g, '/')
      .replace(/&#\d+;/g, '')
      .replace(/&\w+;/g, '')
      // Clean up whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private extractKeywords(text: string): string[] {
    const techTerms = new Set<string>();
    const lower = text.toLowerCase();

    // Common tech keywords and patterns
    const patterns = [
      // Programming languages
      /\b(python|java|javascript|typescript|c\+\+|c#|go|golang|rust|ruby|php|swift|kotlin|scala|r)\b/gi,
      // Frameworks and libraries
      /\b(react|angular|vue|next\.?js|node\.?js|express|django|flask|spring|\.net|rails|laravel|fastapi)\b/gi,
      // Cloud and infrastructure
      /\b(aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|ansible|jenkins|ci\/cd|github actions)\b/gi,
      // Databases
      /\b(sql|mysql|postgresql|postgres|mongodb|redis|dynamodb|elasticsearch|cassandra|sqlite|oracle)\b/gi,
      // Tools and practices
      /\b(git|jira|confluence|agile|scrum|kanban|tdd|devops|microservices|rest|graphql|grpc|api)\b/gi,
      // Data and ML
      /\b(machine learning|ml|ai|data engineering|etl|spark|kafka|airflow|pandas|tensorflow|pytorch)\b/gi,
      // Concepts
      /\b(distributed systems|system design|scalab\w+|high availability|load balancing|caching|monitoring|observability)\b/gi,
      // Soft skills and requirements
      /\b(\d+\+?\s*years?\b)/gi,
      /\b(bachelor'?s?|master'?s?|ph\.?d|computer science|software engineering)\b/gi,
      /\b(leadership|mentoring|cross-functional|stakeholder|communication)\b/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const m of matches) {
          techTerms.add(m.toLowerCase().trim());
        }
      }
    }

    return [...techTerms].sort();
  }
}
