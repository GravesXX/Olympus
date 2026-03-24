import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class ProjectManager {
  constructor(private db: AthenaDB) {}

  async create(params: { name: string; description: string; directory?: string }): Promise<ToolResult> {
    const project = this.db.createProject(params.name, params.description, params.directory);
    const lines = [
      `**Project created: ${project.name}**`,
      `- **ID:** ${project.id}`,
      `- **Phase:** ${project.phase}`,
      `- **Description:** ${project.description}`,
    ];
    if (project.directory) lines.push(`- **Directory:** ${project.directory}`);
    return { content: lines.join('\n') };
  }

  async list(): Promise<ToolResult> {
    const all = this.db.getAllProjects();
    if (all.length === 0) return { content: 'No projects yet.' };

    const grouped: Record<string, typeof all> = {};
    for (const p of all) {
      if (!grouped[p.phase]) grouped[p.phase] = [];
      grouped[p.phase].push(p);
    }

    const sections: string[] = [];
    for (const phase of ['explore', 'build', 'harvest', 'completed']) {
      const projects = grouped[phase] || [];
      sections.push(`### ${phase} (${projects.length})`);
      if (projects.length === 0) {
        sections.push('  _None_');
      } else {
        for (const p of projects) {
          const dir = p.directory ? ` | ${p.directory}` : '';
          sections.push(`  - **${p.name}** — ${p.description}${dir}`);
        }
      }
      sections.push('');
    }
    return { content: sections.join('\n') };
  }

  async open(params: { query: string }): Promise<ToolResult> {
    const all = this.db.getAllProjects();
    const queryLower = params.query.toLowerCase();
    const match = all.find((p) => p.name.toLowerCase().includes(queryLower));

    if (!match) {
      return { content: `No project found matching "${params.query}".`, error: 'project_not_found' };
    }

    const decisions = this.db.getDecisions(match.id);
    const todos = this.db.getTodos(match.id);
    const achievements = this.db.getAchievementsForProject(match.id);

    const lines = [
      `**Opened project: ${match.name}**`,
      `- **Phase:** ${match.phase}`,
      `- **Description:** ${match.description}`,
      `- **Decisions:** ${decisions.length}`,
      `- **Todos:** ${todos.length} (${todos.filter((t) => t.status === 'done').length} done)`,
      `- **Achievements:** ${achievements.length}`,
    ];
    if (match.directory) lines.push(`- **Directory:** ${match.directory}`);
    return { content: lines.join('\n') };
  }

  async advance(params: { project_id: string }): Promise<ToolResult> {
    const before = this.db.getProject(params.project_id);
    if (!before) return { content: 'Project not found.', error: 'project_not_found' };
    if (before.phase === 'completed') return { content: `Project "${before.name}" is already completed.`, error: 'already_completed' };

    this.db.advancePhase(params.project_id);
    const after = this.db.getProject(params.project_id)!;

    return {
      content: [
        `**Phase advanced: ${before.name}**`,
        `- **From:** ${before.phase}`,
        `- **To:** ${after.phase}`,
      ].join('\n'),
    };
  }

  async scan(params: { project_id: string }): Promise<ToolResult> {
    const project = this.db.getProject(params.project_id);
    if (!project) return { content: 'Project not found.', error: 'project_not_found' };
    if (!project.directory) {
      return { content: `Project "${project.name}" has no linked directory.`, error: 'no_directory' };
    }
    if (!fs.existsSync(project.directory)) {
      return { content: `Directory not found: ${project.directory}`, error: 'directory_not_found' };
    }

    const sections: string[] = [`**Project scan: ${project.name}**`, `Directory: ${project.directory}`, ''];

    // Top-level files
    const files = fs.readdirSync(project.directory);
    sections.push('**Files:**');
    for (const f of files.filter((f) => !f.startsWith('.'))) sections.push(`  - ${f}`);
    sections.push('');

    // README
    const readmePath = path.join(project.directory, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf-8');
      sections.push('**README.md (first 20 lines):**');
      sections.push(readme.split('\n').slice(0, 20).join('\n'));
      sections.push('');
    }

    // package.json deps
    const pkgPath = path.join(project.directory, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        sections.push('**Dependencies:**');
        if (deps.length) sections.push(`  Runtime: ${deps.join(', ')}`);
        if (devDeps.length) sections.push(`  Dev: ${devDeps.join(', ')}`);
        sections.push('');
      } catch {}
    }

    // Git log
    try {
      const log = execFileSync('git', ['log', '--oneline', '-10'], {
        cwd: project.directory,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (log.trim()) {
        sections.push('**Recent commits:**');
        sections.push(log.trim());
        sections.push('');
      }
    } catch {}

    return { content: sections.join('\n') };
  }
}
