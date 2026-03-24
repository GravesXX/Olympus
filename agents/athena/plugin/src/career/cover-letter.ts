import fs from 'fs';
import path from 'path';
import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';

const COVER_LETTER_SYSTEM_PROMPT = `You are an expert cover letter writer. Generate a tailored, compelling cover letter that complements (not repeats) the resume.

## Guidelines
- Tone: Professional but personable — this is where personality shows
- Structure: 3-4 paragraphs
  1. Hook: Why this role caught your attention (specific to the company/team/product)
  2. What you bring: Connect hard skills (from achievement bank) with soft skills
  3. Why this company: Reference specific company values, mission, or recent work
  4. Closing: Clear call to action, enthusiasm without desperation
- DO NOT repeat the resume — the cover letter complements it
- Use the JD's language naturally (not keyword-stuffed)
- Show understanding of the company's problems and how you solve them
- Reference specific achievements that map to their needs
- Keep under 400 words
- Weave soft skills naturally: "Led a cross-functional team of 6" not "I have leadership skills"`;

const SOFT_SKILL_HARVEST_PROMPT = `You are a soft skills extraction assistant. Analyze the provided text and extract soft skills demonstrated or claimed.

Return a JSON object with this structure:
{
  "soft_skills": [
    {
      "title": "Short label, e.g. Cross-functional collaboration",
      "description": "Evidence-backed description of how this skill was demonstrated",
      "evidence": ["Specific quote or example from the text"],
      "tags": ["category_tag"]
    }
  ]
}

Categories: leadership, communication, collaboration, problem-solving, adaptability, mentoring, ownership, creativity, conflict-resolution, time-management

Guidelines:
- Extract 2-6 soft skills per text. Quality over quantity.
- Each must have concrete evidence from the source text.
- Frame descriptions as demonstrated capabilities, not self-assessments.
- "Led a cross-functional team of 6 engineers" → leadership + collaboration, not just "leadership".`;

export class CoverLetterEngine {
  constructor(private db: AthenaDB) {}

  buildGeneratePrompt(jdId: string): string {
    const jd = this.db.getJobDescription(jdId);
    if (!jd) return 'Job description not found.';

    const achievements = this.db.getAllAchievements();
    const experiences = this.db.getAllExperiences();
    const softSkills = this.db.getAllSoftSkills();

    const sections: string[] = [
      COVER_LETTER_SYSTEM_PROMPT,
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

    if (softSkills.length > 0) {
      sections.push('--- Soft Skills ---', '');
      for (const s of softSkills) {
        let tags = '';
        try { const parsed = JSON.parse(s.tags); if (parsed.length) tags = ` [${parsed.join(', ')}]`; } catch {}
        sections.push(`- **${s.title}**: ${s.description}${tags}`);
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

    sections.push(
      '--- Instructions ---',
      '',
      'Generate a tailored cover letter for this specific role.',
      'Weave soft skills naturally into the narrative.',
      'Reference specific achievements that map to JD requirements.',
      'Keep under 400 words. Do NOT repeat the resume.',
    );

    return sections.join('\n');
  }

  buildIngestPrompt(coverLetterText: string): string {
    return [
      SOFT_SKILL_HARVEST_PROMPT,
      '',
      '--- Cover Letter Text ---',
      '',
      coverLetterText,
      '',
      '--- Instructions ---',
      '',
      'Extract soft skills from this cover letter.',
      'Return the JSON object as specified above.',
    ].join('\n');
  }

  buildHarvestPrompt(sourceText: string, sourceType: string): string {
    return [
      SOFT_SKILL_HARVEST_PROMPT,
      '',
      `--- Source (${sourceType}) ---`,
      '',
      sourceText,
      '',
      '--- Instructions ---',
      '',
      `Extract soft skills from this ${sourceType}.`,
      'Return the JSON object as specified above.',
    ].join('\n');
  }

  ingest(filePath: string, company?: string, role?: string, versionLabel?: string): ToolResult {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      return { content: '', error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` };
    }

    if (!content.trim()) {
      return { content: '', error: 'File is empty.' };
    }

    const filename = path.basename(filePath);
    const resolvedCompany = company ?? 'Unknown';
    const resolvedRole = role ?? 'Unknown';

    const cl = this.db.addCoverLetter(resolvedCompany, resolvedRole, content, undefined, versionLabel ?? filename);

    const prompt = this.buildIngestPrompt(content);

    return {
      content: [
        `Cover letter ingested and stored (ID: ${cl.id}).`,
        `- **Company:** ${resolvedCompany}`,
        `- **Role:** ${resolvedRole}`,
        `- **Label:** ${cl.version_label ?? filename}`,
        `- **Length:** ${content.length} chars`,
        '',
        '---',
        '',
        'Now extracting soft skills from this cover letter:',
        '',
        prompt,
      ].join('\n'),
    };
  }

  listCoverLetters(company?: string): ToolResult {
    const letters = company
      ? this.db.getCoverLettersByCompany(company)
      : this.db.getAllCoverLetters();

    if (letters.length === 0) {
      return { content: 'No cover letters stored yet. Use `athena_cover_letter_ingest` to add existing ones or `athena_cover_letter_generate` to create one.' };
    }

    const lines: string[] = [`**${letters.length} cover letter(s):**`, ''];
    for (const cl of letters) {
      const jdInfo = cl.job_id ? ` (JD: ${cl.job_id.slice(0, 8)})` : '';
      lines.push(`- **${cl.id.slice(0, 8)}** — ${cl.company} / ${cl.role}${jdInfo} (${cl.created_at})`);
    }
    return { content: lines.join('\n') };
  }

  listSoftSkills(source?: string): ToolResult {
    const skills = source
      ? this.db.getSoftSkillsBySource(source)
      : this.db.getAllSoftSkills();

    if (skills.length === 0) {
      return { content: 'No soft skills in the knowledge base yet. Extract them from cover letters or add manually.' };
    }

    const lines: string[] = [`**Soft Skills Knowledge Base (${skills.length})**`, ''];
    const grouped: Record<string, typeof skills> = {};
    for (const s of skills) {
      let tagList: string[] = [];
      try { tagList = JSON.parse(s.tags); } catch {}
      const category = tagList[0] ?? 'uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(s);
    }
    for (const [category, items] of Object.entries(grouped)) {
      lines.push(`### ${category} (${items.length})`);
      for (const item of items) {
        lines.push(`- **${item.title}** (${item.source}): ${item.description}`);
      }
      lines.push('');
    }
    return { content: lines.join('\n') };
  }

  addSoftSkill(params: {
    title: string;
    description: string;
    evidence_json?: string;
    source?: string;
    tags_json?: string;
  }): ToolResult {
    let evidence: unknown[] = [];
    if (params.evidence_json) {
      try { evidence = JSON.parse(params.evidence_json); } catch { evidence = []; }
    }
    let tags: string[] = [];
    if (params.tags_json) {
      try { tags = JSON.parse(params.tags_json); } catch { tags = []; }
    }
    const source = params.source ?? 'manual';

    const skill = this.db.addSoftSkill(params.title, params.description, evidence, source, tags);

    return {
      content: [
        `**Soft skill added**`,
        `- **Title:** ${skill.title}`,
        `- **Source:** ${skill.source}`,
        `- **Description:** ${skill.description}`,
        ...(tags.length > 0 ? [`- **Tags:** ${tags.join(', ')}`] : []),
      ].join('\n'),
    };
  }
}
