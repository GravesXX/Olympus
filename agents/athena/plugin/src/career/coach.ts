import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';

export class CareerCoach {
  constructor(private db: AthenaDB) {}

  async addExperience(params: {
    company: string; role: string; period: string; description: string; highlights_json?: string;
  }): Promise<ToolResult> {
    let highlights: string[] = [];
    if (params.highlights_json) {
      try { highlights = JSON.parse(params.highlights_json); } catch { highlights = []; }
    }

    const exp = this.db.addExperience(params.company, params.role, params.period, params.description, highlights, []);
    const lines = [
      `**Experience added**`,
      `- **Company:** ${exp.company}`,
      `- **Role:** ${exp.role}`,
      `- **Period:** ${params.period}`,
      `- **Description:** ${params.description}`,
    ];
    if (highlights.length > 0) {
      lines.push('- **Highlights:**');
      for (const h of highlights) lines.push(`  - ${h}`);
    }
    return { content: lines.join('\n') };
  }

  async listAchievements(params: { category?: string; project_id?: string }): Promise<ToolResult> {
    let achievements;
    if (params.category) achievements = this.db.getAchievementsByCategory(params.category);
    else if (params.project_id) achievements = this.db.getAchievementsForProject(params.project_id);
    else achievements = this.db.getAllAchievements();

    if (achievements.length === 0) return { content: 'No achievements in the bank yet.' };

    const lines: string[] = [`**Achievement Bank (${achievements.length})**`, ''];
    const grouped: Record<string, typeof achievements> = {};
    for (const a of achievements) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }
    for (const [category, items] of Object.entries(grouped)) {
      lines.push(`### ${category} (${items.length})`);
      for (const item of items) {
        let tags = '';
        try { const parsed = JSON.parse(item.tags); if (parsed.length > 0) tags = ` [${parsed.join(', ')}]`; } catch {}
        lines.push(`- **${item.title}**: ${item.description}${tags}`);
      }
      lines.push('');
    }
    return { content: lines.join('\n') };
  }
}
