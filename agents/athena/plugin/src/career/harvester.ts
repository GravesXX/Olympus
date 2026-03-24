import { AthenaDB } from '../db/database.js';

interface HarvestEntry {
  category: string;
  title: string;
  description: string;
  tags: string[];
}

interface HarvestResult {
  achievements: HarvestEntry[];
}

export const HARVEST_SYSTEM_PROMPT = `You are an achievement extraction assistant. Given a project's context (decisions made, tasks completed, description), extract concrete skills, achievements, challenges overcome, and reflections.

Return a JSON object with this structure:
{
  "achievements": [
    {
      "category": "skill" | "achievement" | "challenge" | "reflection",
      "title": "Short label (2-5 words)",
      "description": "Recruiter-ready description. Use action verbs, quantify where possible. Frame as accomplishment, not responsibility.",
      "tags": ["tech_tag_1", "tech_tag_2"]
    }
  ]
}

Guidelines:
- "skill": Technical or soft skills demonstrated. Be specific: "TypeScript with strict mode" not "JavaScript".
- "achievement": Concrete outcomes with measurable impact where possible.
- "challenge": Non-trivial problems solved. Frame as "overcame X by doing Y".
- "reflection": Lessons learned, growth insights.
- Write descriptions in recruiter-ready language.
- Extract 3-8 items per project. Quality over quantity.`;

export class Harvester {
  constructor(private db: AthenaDB) {}

  buildHarvestPrompt(projectId: string): string {
    const project = this.db.getProject(projectId);
    if (!project) return 'Project not found.';

    const decisions = this.db.getDecisions(projectId);
    const todos = this.db.getTodos(projectId);

    const sections: string[] = [HARVEST_SYSTEM_PROMPT, '', '--- Project Context ---', `Project: ${project.name}`, `Description: ${project.description}`];
    if (project.directory) sections.push(`Directory: ${project.directory}`);

    if (decisions.length > 0) {
      sections.push('', 'Key decisions made:');
      for (const d of decisions) sections.push(`- ${d.title}: chose "${d.chosen}" because ${d.reasoning}`);
    }

    if (todos.length > 0) {
      sections.push('', 'Tasks:');
      for (const t of todos) sections.push(`- [${t.status}] ${t.title}`);
    }

    sections.push('', 'Extract achievements from this project.');
    return sections.join('\n');
  }

  applyHarvest(projectId: string, jsonResult: string): void {
    let parsed: HarvestResult;
    try {
      parsed = JSON.parse(jsonResult);
    } catch {
      throw new Error('Failed to parse harvest results. Expected valid JSON.');
    }
    for (const entry of parsed.achievements) {
      this.db.addAchievement(projectId, entry.category, entry.title, entry.description, [], entry.tags);
    }
  }
}
