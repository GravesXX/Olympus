import { v4 as uuidv4 } from 'uuid';
import { ObsidianAdapter } from 'obsidian-adapter';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  directory: string | null;
  phase: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  project_id: string | null;
  phase: string;
  created_at: string;
  updated_at: string;
  summary: string | null;
}

export interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
  is_deleted: number;
}

export interface Decision {
  id: string;
  project_id: string;
  title: string;
  chosen: string;
  alternatives: string;
  reasoning: string;
  created_at: string;
}

export interface Todo {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: number;
  created_at: string;
  completed_at: string | null;
}

export interface Achievement {
  id: string;
  project_id: string | null;
  category: string;
  title: string;
  description: string;
  evidence: string;
  tags: string;
  created_at: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;
  description: string;
  highlights: string;
  recruiter_insights: string;
  created_at: string;
  updated_at: string;
}

export interface JobDescription {
  id: string;
  url: string;
  raw_text: string;
  analysis: string | null;
  fetched_at: string;
}

export interface Resume {
  id: string;
  filename: string;
  version_label: string | null;
  content: string;
  ingested_at: string;
}

export interface SoftSkill {
  id: string;
  title: string;
  description: string;
  evidence: string;
  source: string;
  tags: string;
  created_at: string;
}

export interface CoverLetter {
  id: string;
  job_id: string | null;
  company: string;
  role: string;
  content: string;
  version_label: string | null;
  created_at: string;
}

// ── Message parsing helpers ─────────────────────────────────────────────────

const MSG_TAG_RE = /<!-- msg:([^:]+):deleted=(\d) -->/;

function formatMessage(msg: Message): string {
  return `### ${msg.created_at} — ${msg.role}\n${msg.content}\n<!-- msg:${msg.id}:deleted=${msg.is_deleted} -->`;
}

function parseMessages(body: string, sessionId: string): Message[] {
  const messages: Message[] = [];
  const blocks = body.split(/(?=^### \d{4}-)/m);

  for (const block of blocks) {
    const headerMatch = block.match(/^### (\S+) — (\S+)\n/);
    const tagMatch = block.match(MSG_TAG_RE);
    if (!headerMatch || !tagMatch) continue;

    const contentStart = block.indexOf('\n') + 1;
    const contentEnd = block.lastIndexOf('<!-- msg:');
    const content = block.slice(contentStart, contentEnd).trim();

    messages.push({
      id: tagMatch[1],
      session_id: sessionId,
      role: headerMatch[2],
      content,
      created_at: headerMatch[1],
      is_deleted: parseInt(tagMatch[2], 10),
    });
  }
  return messages;
}

// ── Phase Order ─────────────────────────────────────────────────────────────

const PHASE_ORDER = ['explore', 'build', 'harvest', 'completed'] as const;

// ── AthenaDB Class ──────────────────────────────────────────────────────────

export class AthenaDB {
  private adapter: ObsidianAdapter;

  constructor(vaultPath: string) {
    this.adapter = new ObsidianAdapter(vaultPath, 'Agents/Athena');

    // Ensure required folders exist
    this.adapter.ensureFolder('Projects');
    this.adapter.ensureFolder('Decisions');
    this.adapter.ensureFolder('Todos');
    this.adapter.ensureFolder('Achievements');
    this.adapter.ensureFolder('Experiences');
    this.adapter.ensureFolder('Resumes');
    this.adapter.ensureFolder('Job Descriptions');
    this.adapter.ensureFolder('Soft Skills');
    this.adapter.ensureFolder('Cover Letters');
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  close(): void {
    // No-op for Obsidian adapter
  }

  // ── Introspection ───────────────────────────────────────────────────────

  listTables(): string[] {
    return ['projects', 'sessions', 'messages', 'decisions', 'todos', 'achievements', 'experiences', 'resumes', 'job_descriptions', 'soft_skills', 'cover_letters'];
  }

  // ── Projects ────────────────────────────────────────────────────────────

  createProject(name: string, description: string, directory?: string): Project {
    const id = uuidv4();
    const now = new Date().toISOString();
    const filename = `${this.adapter.sanitize(name)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote('Projects', filename, {
      id,
      type: 'athena-project',
      name,
      directory: directory ?? null,
      phase: 'explore',
      created_at: now,
      updated_at: now,
      tags: ['athena', 'project'],
    }, `# ${name}\n\n${description}\n`);

    return this.getProject(id)!;
  }

  getProject(id: string): Project | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-project') return undefined;
    return this.projectFromEntry(entry);
  }

  getProjectsByPhase(phase: string): Project[] {
    return this.adapter.findByType('athena-project')
      .filter(e => e.frontmatter.phase === phase)
      .map(e => this.projectFromEntry(e));
  }

  getAllProjects(): Project[] {
    return this.adapter.findByType('athena-project')
      .map(e => this.projectFromEntry(e));
  }

  advancePhase(id: string): void {
    const project = this.getProject(id);
    if (!project) return;

    const currentIndex = PHASE_ORDER.indexOf(
      project.phase as (typeof PHASE_ORDER)[number]
    );
    if (currentIndex < 0 || currentIndex >= PHASE_ORDER.length - 1) return;

    const nextPhase = PHASE_ORDER[currentIndex + 1];
    const entry = this.adapter.findById(id);
    if (!entry) return;

    this.adapter.updateFrontmatter(entry.relativePath, {
      phase: nextPhase,
      updated_at: new Date().toISOString(),
    });
  }

  updateProjectDirectory(id: string, directory: string): void {
    const entry = this.adapter.findById(id);
    if (!entry) return;

    this.adapter.updateFrontmatter(entry.relativePath, {
      directory,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Sessions ────────────────────────────────────────────────────────────
  // Sessions are stored as notes inside the project folder (or a Career folder
  // for career sessions). Messages are inline in the session note body.

  createSession(projectId: string | null, phase: string): Session {
    const id = uuidv4();
    const now = new Date().toISOString();

    let folder: string;
    let titlePrefix: string;
    if (projectId) {
      const project = this.getProject(projectId);
      const projectName = project ? this.adapter.sanitize(project.name) : projectId.slice(0, 8);
      folder = `Projects/${projectName}`;
      titlePrefix = `Session ${phase}`;
    } else {
      folder = 'Projects/Career';
      titlePrefix = `Career Session`;
    }

    this.adapter.ensureFolder(folder);
    const filename = `${this.adapter.sanitize(titlePrefix)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote(folder, filename, {
      id,
      type: 'athena-session',
      project_id: projectId,
      phase,
      created_at: now,
      updated_at: now,
      summary: null,
      tags: ['athena', 'session'],
    }, `# ${titlePrefix}\n\n## Conversation\n`);

    return this.getSession(id)!;
  }

  private getSession(id: string): Session | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-session') return undefined;
    return this.sessionFromEntry(entry);
  }

  getSessionsForProject(projectId: string): Session[] {
    return this.adapter.findByType('athena-session')
      .filter(e => e.frontmatter.project_id === projectId)
      .map(e => this.sessionFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  getCareerSessions(): Session[] {
    return this.adapter.findByType('athena-session')
      .filter(e => e.frontmatter.project_id === null && e.frontmatter.phase === 'career')
      .map(e => this.sessionFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  updateSessionSummary(id: string, summary: string): void {
    const entry = this.adapter.findById(id);
    if (!entry) return;

    this.adapter.updateFrontmatter(entry.relativePath, {
      summary,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Messages ────────────────────────────────────────────────────────────

  addMessage(sessionId: string, role: string, content: string): Message {
    const id = uuidv4();
    const now = new Date().toISOString();
    const msg: Message = { id, session_id: sessionId, role, content, created_at: now, is_deleted: 0 };

    const entry = this.adapter.findById(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);

    this.adapter.appendToBody(entry.relativePath, formatMessage(msg));

    // Update session timestamp
    this.adapter.updateFrontmatter(entry.relativePath, {
      updated_at: now,
    });

    return msg;
  }

  getSessionMessages(sessionId: string): Message[] {
    const entry = this.adapter.findById(sessionId);
    if (!entry) return [];

    const note = this.adapter.readNote(entry.relativePath);
    if (!note) return [];

    return parseMessages(note.body, sessionId).filter(m => m.is_deleted === 0);
  }

  // ── Decisions ───────────────────────────────────────────────────────────

  addDecision(
    projectId: string,
    title: string,
    chosen: string,
    alternatives: unknown[],
    reasoning: string
  ): Decision {
    const id = uuidv4();
    const now = new Date().toISOString();

    const project = this.getProject(projectId);
    const projectName = project ? this.adapter.sanitize(project.name) : projectId.slice(0, 8);
    const folder = `Decisions/${projectName}`;
    this.adapter.ensureFolder(folder);

    const filename = `${this.adapter.sanitize(title)} - ${this.adapter.shortId(id)}.md`;
    const alternativesStr = JSON.stringify(alternatives);

    this.adapter.createNote(folder, filename, {
      id,
      type: 'athena-decision',
      project_id: projectId,
      title,
      chosen,
      alternatives: alternativesStr,
      created_at: now,
      tags: ['athena', 'decision'],
    }, `# ${title}\n\n## Chosen\n${chosen}\n\n## Alternatives\n${alternativesStr}\n\n## Reasoning\n${reasoning}\n`);

    return this.getDecision(id)!;
  }

  private getDecision(id: string): Decision | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-decision') return undefined;
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    const reasoningMatch = note?.body.match(/## Reasoning\n([\s\S]*?)$/);
    return {
      id: fm.id as string,
      project_id: fm.project_id as string,
      title: fm.title as string,
      chosen: fm.chosen as string,
      alternatives: fm.alternatives as string,
      reasoning: reasoningMatch?.[1]?.trim() ?? '',
      created_at: fm.created_at as string,
    };
  }

  getDecisions(projectId: string): Decision[] {
    return this.adapter.findByType('athena-decision')
      .filter(e => e.frontmatter.project_id === projectId)
      .map(e => {
        const fm = e.frontmatter;
        const note = this.adapter.readNote(e.relativePath);
        const reasoningMatch = note?.body.match(/## Reasoning\n([\s\S]*?)$/);
        return {
          id: fm.id as string,
          project_id: fm.project_id as string,
          title: fm.title as string,
          chosen: fm.chosen as string,
          alternatives: fm.alternatives as string,
          reasoning: reasoningMatch?.[1]?.trim() ?? '',
          created_at: fm.created_at as string,
        };
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // ── Todos ───────────────────────────────────────────────────────────────

  addTodo(projectId: string, title: string, priority: number): Todo {
    const id = uuidv4();
    const now = new Date().toISOString();

    const project = this.getProject(projectId);
    const projectName = project ? this.adapter.sanitize(project.name) : projectId.slice(0, 8);
    const folder = `Todos/${projectName}`;
    this.adapter.ensureFolder(folder);

    const filename = `${this.adapter.sanitize(title)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote(folder, filename, {
      id,
      type: 'athena-todo',
      project_id: projectId,
      title,
      status: 'pending',
      priority,
      created_at: now,
      completed_at: null,
      tags: ['athena', 'todo'],
    }, `# ${title}\n`);

    return this.getTodo(id)!;
  }

  getTodo(id: string): Todo | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-todo') return undefined;
    return this.todoFromEntry(entry);
  }

  getTodos(projectId: string): Todo[] {
    return this.adapter.findByType('athena-todo')
      .filter(e => e.frontmatter.project_id === projectId)
      .map(e => this.todoFromEntry(e))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.created_at.localeCompare(b.created_at);
      });
  }

  updateTodoStatus(id: string, status: string): void {
    const entry = this.adapter.findById(id);
    if (!entry) return;

    const completedAt = status === 'done' ? new Date().toISOString() : null;
    this.adapter.updateFrontmatter(entry.relativePath, {
      status,
      completed_at: completedAt,
    });
  }

  // ── Achievements ────────────────────────────────────────────────────────

  addAchievement(
    projectId: string | null,
    category: string,
    title: string,
    description: string,
    evidence: unknown[],
    tags: string[]
  ): Achievement {
    const id = uuidv4();
    const now = new Date().toISOString();

    const folder = `Achievements/${this.adapter.sanitize(category)}`;
    this.adapter.ensureFolder(folder);

    const filename = `${this.adapter.sanitize(title)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote(folder, filename, {
      id,
      type: 'athena-achievement',
      project_id: projectId,
      category,
      title,
      evidence: JSON.stringify(evidence),
      achievement_tags: JSON.stringify(tags),
      created_at: now,
      tags: ['athena', 'achievement'],
    }, `# ${title}\n\n${description}\n`);

    return this.getAchievement(id)!;
  }

  private getAchievement(id: string): Achievement | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-achievement') return undefined;
    return this.achievementFromEntry(entry);
  }

  getAchievementsByCategory(category: string): Achievement[] {
    return this.adapter.findByType('athena-achievement')
      .filter(e => e.frontmatter.category === category)
      .map(e => this.achievementFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  getAchievementsForProject(projectId: string): Achievement[] {
    return this.adapter.findByType('athena-achievement')
      .filter(e => e.frontmatter.project_id === projectId)
      .map(e => this.achievementFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  getAllAchievements(): Achievement[] {
    return this.adapter.findByType('athena-achievement')
      .map(e => this.achievementFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // ── Experiences ─────────────────────────────────────────────────────────

  addExperience(
    company: string,
    role: string,
    period: string,
    description: string,
    highlights: string[],
    recruiterInsights: string[]
  ): Experience {
    const id = uuidv4();
    const now = new Date().toISOString();

    const filename = `${this.adapter.sanitize(company)} - ${this.adapter.sanitize(role)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote('Experiences', filename, {
      id,
      type: 'athena-experience',
      company,
      role,
      period,
      highlights: JSON.stringify(highlights),
      recruiter_insights: JSON.stringify(recruiterInsights),
      created_at: now,
      updated_at: now,
      tags: ['athena', 'experience'],
    }, `# ${company} — ${role}\n\n**Period:** ${period}\n\n${description}\n`);

    return this.getExperience(id)!;
  }

  private getExperience(id: string): Experience | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-experience') return undefined;
    return this.experienceFromEntry(entry);
  }

  getAllExperiences(): Experience[] {
    return this.adapter.findByType('athena-experience')
      .map(e => this.experienceFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  updateExperienceInsights(id: string, insights: string[]): void {
    const entry = this.adapter.findById(id);
    if (!entry) return;

    this.adapter.updateFrontmatter(entry.relativePath, {
      recruiter_insights: JSON.stringify(insights),
      updated_at: new Date().toISOString(),
    });
  }

  // ── Stats ───────────────────────────────────────────────────────────────

  getProjectCount(): number {
    return this.adapter.findByType('athena-project').length;
  }

  getAchievementCount(): number {
    return this.adapter.findByType('athena-achievement').length;
  }

  // ── Resumes ──────────────────────────────────────────────────────────

  addResume(filename: string, content: string, versionLabel?: string): Resume {
    const id = uuidv4();
    const now = new Date().toISOString();
    const label = versionLabel ?? filename;

    const noteFilename = `${this.adapter.sanitize(label)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote('Resumes', noteFilename, {
      id,
      type: 'athena-resume',
      filename,
      version_label: versionLabel ?? null,
      ingested_at: now,
      tags: ['athena', 'resume'],
    }, `# Resume: ${label}\n\n${content}\n`);

    return this.getResume(id)!;
  }

  private getResume(id: string): Resume | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-resume') return undefined;
    return this.resumeFromEntry(entry);
  }

  getAllResumes(): Resume[] {
    return this.adapter.findByType('athena-resume')
      .map(e => this.resumeFromEntry(e))
      .sort((a, b) => a.ingested_at.localeCompare(b.ingested_at));
  }

  getResumeCount(): number {
    return this.adapter.findByType('athena-resume').length;
  }

  clearResumes(): void {
    const resumes = this.adapter.findByType('athena-resume');
    for (const entry of resumes) {
      this.adapter.deleteNote(entry.relativePath);
    }
  }

  // ── Job Descriptions ──────────────────────────────────────────────────

  addJobDescription(url: string, rawText: string): JobDescription {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Create a slug from the URL
    let slug: string;
    try {
      const parsed = new URL(url);
      slug = parsed.hostname + parsed.pathname;
    } catch {
      slug = url;
    }
    slug = this.adapter.sanitize(slug);

    const filename = `${slug} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote('Job Descriptions', filename, {
      id,
      type: 'athena-jd',
      url,
      analysis: null,
      fetched_at: now,
      tags: ['athena', 'job-description'],
    }, `# Job Description\n\n**URL:** ${url}\n\n## Raw Text\n\n${rawText}\n`);

    return this.getJobDescription(id)!;
  }

  getJobDescription(id: string): JobDescription | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-jd') return undefined;
    return this.jdFromEntry(entry);
  }

  updateJobDescriptionAnalysis(id: string, analysis: string): void {
    const entry = this.adapter.findById(id);
    if (!entry) return;

    this.adapter.updateFrontmatter(entry.relativePath, {
      analysis,
    });

    // Also append analysis to the body
    const note = this.adapter.readNote(entry.relativePath);
    if (note && !note.body.includes('## Analysis')) {
      this.adapter.appendToBody(entry.relativePath, `## Analysis\n\n${analysis}\n`);
    } else if (note) {
      const newBody = note.body.replace(/## Analysis\n[\s\S]*$/, `## Analysis\n\n${analysis}\n`);
      this.adapter.replaceBody(entry.relativePath, newBody);
    }
  }

  getAllJobDescriptions(): JobDescription[] {
    return this.adapter.findByType('athena-jd')
      .map(e => this.jdFromEntry(e))
      .sort((a, b) => a.fetched_at.localeCompare(b.fetched_at));
  }

  // ── Soft Skills ────────────────────────────────────────────────────────

  addSoftSkill(
    title: string,
    description: string,
    evidence: unknown[],
    source: string,
    tags: string[]
  ): SoftSkill {
    const id = uuidv4();
    const now = new Date().toISOString();

    const filename = `${this.adapter.sanitize(title)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote('Soft Skills', filename, {
      id,
      type: 'athena-soft-skill',
      title,
      evidence: JSON.stringify(evidence),
      source,
      soft_skill_tags: JSON.stringify(tags),
      created_at: now,
      tags: ['athena', 'soft-skill'],
    }, `# ${title}\n\n${description}\n`);

    return this.getSoftSkill(id)!;
  }

  getSoftSkill(id: string): SoftSkill | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-soft-skill') return undefined;
    return this.softSkillFromEntry(entry);
  }

  getAllSoftSkills(): SoftSkill[] {
    return this.adapter.findByType('athena-soft-skill')
      .map(e => this.softSkillFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  getSoftSkillsBySource(source: string): SoftSkill[] {
    return this.adapter.findByType('athena-soft-skill')
      .filter(e => e.frontmatter.source === source)
      .map(e => this.softSkillFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // ── Cover Letters ─────────────────────────────────────────────────────

  addCoverLetter(
    company: string,
    role: string,
    content: string,
    jobId?: string,
    versionLabel?: string
  ): CoverLetter {
    const id = uuidv4();
    const now = new Date().toISOString();
    const label = versionLabel ?? `${company} - ${role}`;

    const filename = `${this.adapter.sanitize(label)} - ${this.adapter.shortId(id)}.md`;

    this.adapter.createNote('Cover Letters', filename, {
      id,
      type: 'athena-cover-letter',
      job_id: jobId ?? null,
      company,
      role,
      version_label: versionLabel ?? null,
      created_at: now,
      tags: ['athena', 'cover-letter'],
    }, `# Cover Letter: ${label}\n\n${content}\n`);

    return this.getCoverLetter(id)!;
  }

  getCoverLetter(id: string): CoverLetter | undefined {
    const entry = this.adapter.findById(id);
    if (!entry || entry.frontmatter.type !== 'athena-cover-letter') return undefined;
    return this.coverLetterFromEntry(entry);
  }

  getAllCoverLetters(): CoverLetter[] {
    return this.adapter.findByType('athena-cover-letter')
      .map(e => this.coverLetterFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  getCoverLettersByCompany(company: string): CoverLetter[] {
    return this.adapter.findByType('athena-cover-letter')
      .filter(e => e.frontmatter.company === company)
      .map(e => this.coverLetterFromEntry(e))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private projectFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): Project {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    // Description is in the body after the heading
    let description = '';
    if (note) {
      const lines = note.body.split('\n');
      // Skip the heading line(s) and empty lines after it
      const descLines: string[] = [];
      let pastHeading = false;
      for (const line of lines) {
        if (!pastHeading && line.startsWith('# ')) {
          pastHeading = true;
          continue;
        }
        if (pastHeading) {
          descLines.push(line);
        }
      }
      description = descLines.join('\n').trim();
    }
    return {
      id: fm.id as string,
      name: fm.name as string,
      description,
      directory: (fm.directory as string) ?? null,
      phase: fm.phase as string,
      created_at: fm.created_at as string,
      updated_at: fm.updated_at as string,
    };
  }

  private sessionFromEntry(entry: { frontmatter: Record<string, unknown> }): Session {
    const fm = entry.frontmatter;
    return {
      id: fm.id as string,
      project_id: (fm.project_id as string) ?? null,
      phase: fm.phase as string,
      created_at: fm.created_at as string,
      updated_at: fm.updated_at as string,
      summary: (fm.summary as string) ?? null,
    };
  }

  private todoFromEntry(entry: { frontmatter: Record<string, unknown> }): Todo {
    const fm = entry.frontmatter;
    return {
      id: fm.id as string,
      project_id: fm.project_id as string,
      title: fm.title as string,
      status: fm.status as string,
      priority: fm.priority as number,
      created_at: fm.created_at as string,
      completed_at: (fm.completed_at as string) ?? null,
    };
  }

  private achievementFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): Achievement {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    // Description is in the body after the heading
    let description = '';
    if (note) {
      const lines = note.body.split('\n');
      const descLines: string[] = [];
      let pastHeading = false;
      for (const line of lines) {
        if (!pastHeading && line.startsWith('# ')) {
          pastHeading = true;
          continue;
        }
        if (pastHeading) {
          descLines.push(line);
        }
      }
      description = descLines.join('\n').trim();
    }
    return {
      id: fm.id as string,
      project_id: (fm.project_id as string) ?? null,
      category: fm.category as string,
      title: fm.title as string,
      description,
      evidence: (fm.evidence as string) ?? '[]',
      tags: (fm.achievement_tags as string) ?? '[]',
      created_at: fm.created_at as string,
    };
  }

  private experienceFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): Experience {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    // Description is in the body after heading and period line
    let description = '';
    if (note) {
      const lines = note.body.split('\n');
      const descLines: string[] = [];
      let pastMeta = false;
      for (const line of lines) {
        if (line.startsWith('# ') || line.startsWith('**Period:**')) continue;
        if (!pastMeta && line.trim() === '') {
          pastMeta = true;
          continue;
        }
        if (pastMeta) {
          descLines.push(line);
        }
      }
      description = descLines.join('\n').trim();
    }
    return {
      id: fm.id as string,
      company: fm.company as string,
      role: fm.role as string,
      period: fm.period as string,
      description,
      highlights: (fm.highlights as string) ?? '[]',
      recruiter_insights: (fm.recruiter_insights as string) ?? '[]',
      created_at: fm.created_at as string,
      updated_at: fm.updated_at as string,
    };
  }

  private resumeFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): Resume {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    // Content is the body after the heading
    let content = '';
    if (note) {
      const lines = note.body.split('\n');
      const contentLines: string[] = [];
      let pastHeading = false;
      for (const line of lines) {
        if (!pastHeading && line.startsWith('# ')) {
          pastHeading = true;
          continue;
        }
        if (pastHeading) {
          contentLines.push(line);
        }
      }
      content = contentLines.join('\n').trim();
    }
    return {
      id: fm.id as string,
      filename: fm.filename as string,
      version_label: (fm.version_label as string) ?? null,
      content,
      ingested_at: fm.ingested_at as string,
    };
  }

  private jdFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): JobDescription {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    // raw_text is in the "## Raw Text" section
    let rawText = '';
    let analysis: string | null = (fm.analysis as string) ?? null;
    if (note) {
      const rawMatch = note.body.match(/## Raw Text\n\n([\s\S]*?)(?=\n## Analysis|$)/);
      rawText = rawMatch?.[1]?.trim() ?? '';
    }
    return {
      id: fm.id as string,
      url: fm.url as string,
      raw_text: rawText,
      analysis,
      fetched_at: fm.fetched_at as string,
    };
  }

  private softSkillFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): SoftSkill {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    let description = '';
    if (note) {
      const lines = note.body.split('\n');
      const descLines: string[] = [];
      let pastHeading = false;
      for (const line of lines) {
        if (!pastHeading && line.startsWith('# ')) {
          pastHeading = true;
          continue;
        }
        if (pastHeading) {
          descLines.push(line);
        }
      }
      description = descLines.join('\n').trim();
    }
    return {
      id: fm.id as string,
      title: fm.title as string,
      description,
      evidence: (fm.evidence as string) ?? '[]',
      source: fm.source as string,
      tags: (fm.soft_skill_tags as string) ?? '[]',
      created_at: fm.created_at as string,
    };
  }

  private coverLetterFromEntry(entry: { relativePath: string; frontmatter: Record<string, unknown> }): CoverLetter {
    const fm = entry.frontmatter;
    const note = this.adapter.readNote(entry.relativePath);
    let content = '';
    if (note) {
      const lines = note.body.split('\n');
      const contentLines: string[] = [];
      let pastHeading = false;
      for (const line of lines) {
        if (!pastHeading && line.startsWith('# ')) {
          pastHeading = true;
          continue;
        }
        if (pastHeading) {
          contentLines.push(line);
        }
      }
      content = contentLines.join('\n').trim();
    }
    return {
      id: fm.id as string,
      job_id: (fm.job_id as string) ?? null,
      company: fm.company as string,
      role: fm.role as string,
      content,
      version_label: (fm.version_label as string) ?? null,
      created_at: fm.created_at as string,
    };
  }
}
