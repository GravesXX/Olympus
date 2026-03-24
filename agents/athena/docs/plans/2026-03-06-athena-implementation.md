# Athena Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a career-focused AI agent on OpenClaw with project lifecycle management (explore → build → harvest), achievement tracking, career coaching, and resume generation.

**Architecture:** Athena is an OpenClaw plugin (TypeScript) that registers 14 agent tools for project lifecycle, task tracking, achievement harvesting, career coaching, and resume generation. It uses a local SQLite database for persistent storage and integrates with OpenClaw's workspace system for persona configuration. Project scanning reads real git history and file structures from linked directories.

**Tech Stack:** OpenClaw (Node.js >=22, TypeScript), better-sqlite3, uuid, vitest

---

## Task 1: Bootstrap Project Structure and Plugin Manifest

**Files:**
- Create: `plugin/package.json`
- Create: `plugin/tsconfig.json`
- Create: `plugin/openclaw.plugin.json`
- Create: `plugin/src/index.ts`
- Create: `plugin/src/types.ts`

**Step 1: Create plugin/package.json**

```json
{
  "name": "athena-plugin",
  "version": "0.1.0",
  "description": "Athena — strategic career engineer agent for OpenClaw",
  "main": "index.js",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc"
  },
  "type": "commonjs",
  "openclaw": {
    "extensions": ["./src/index.ts"]
  },
  "dependencies": {
    "better-sqlite3": "^12.6.2",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^25.3.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Create plugin/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create plugin/openclaw.plugin.json**

```json
{
  "id": "athena",
  "name": "Athena - Strategic Career Engineer",
  "version": "0.1.0",
  "description": "Career-focused agent with project lifecycle management, achievement tracking, and resume generation",
  "entry": "src/index.ts",
  "skills": ["skills"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

**Step 4: Create plugin/src/types.ts**

```typescript
export interface PluginAPI {
  registerTool(tool: ToolDefinition): void;
  registerCommand(command: CommandDefinition): void;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ParameterDef>;
  run: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ParameterDef {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface CommandDefinition {
  name: string;
  description: string;
  run: (args: string) => Promise<string>;
}

export interface ToolResult {
  content: string;
  error?: string;
}
```

**Step 5: Create plugin/src/index.ts (stub)**

```typescript
import type { PluginAPI } from './types.js';

export const id = 'athena';
export const name = 'Athena - Strategic Career Engineer';

export function register(api: PluginAPI) {
  console.log('[Athena] Plugin loaded successfully');
}
```

**Step 6: Install dependencies**

```bash
cd ~/Desktop/athena/plugin && npm install
```

**Step 7: Verify build compiles**

```bash
cd ~/Desktop/athena/plugin && npx tsc --noEmit
```

Expected: no errors.

**Step 8: Commit**

```bash
cd ~/Desktop/athena
git add plugin/package.json plugin/tsconfig.json plugin/openclaw.plugin.json plugin/src/index.ts plugin/src/types.ts
git commit -m "feat: bootstrap Athena plugin structure with manifest and types"
```

---

## Task 2: Database Schema and AthenaDB Class

**Files:**
- Create: `plugin/src/db/schema.sql`
- Create: `plugin/src/db/database.ts`
- Create: `plugin/src/db/__tests__/database.test.ts`

**Step 1: Write the failing test**

Create `plugin/src/db/__tests__/database.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AthenaDB } from '../database.js';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(__dirname, 'test-athena.db');

describe('AthenaDB', () => {
  let db: AthenaDB;

  beforeEach(() => {
    db = new AthenaDB(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should create all tables on initialization', () => {
    const tables = db.listTables();
    expect(tables).toContain('projects');
    expect(tables).toContain('sessions');
    expect(tables).toContain('messages');
    expect(tables).toContain('decisions');
    expect(tables).toContain('todos');
    expect(tables).toContain('achievements');
    expect(tables).toContain('experiences');
  });

  // ── Projects ──────────────────────────────────────────────────────────

  it('should create a project', () => {
    const project = db.createProject('My App', 'A web app');
    expect(project.name).toBe('My App');
    expect(project.phase).toBe('explore');
    expect(project.id).toBeDefined();
  });

  it('should create a project with a linked directory', () => {
    const project = db.createProject('CLI Tool', 'A CLI', '/Users/me/cli-tool');
    expect(project.directory).toBe('/Users/me/cli-tool');
  });

  it('should advance a project phase', () => {
    const project = db.createProject('Test', 'desc');
    db.advancePhase(project.id);
    const updated = db.getProject(project.id);
    expect(updated?.phase).toBe('build');
  });

  it('should follow phase order: explore → build → harvest → completed', () => {
    const project = db.createProject('Test', 'desc');
    db.advancePhase(project.id);
    expect(db.getProject(project.id)?.phase).toBe('build');
    db.advancePhase(project.id);
    expect(db.getProject(project.id)?.phase).toBe('harvest');
    db.advancePhase(project.id);
    expect(db.getProject(project.id)?.phase).toBe('completed');
  });

  it('should not advance past completed', () => {
    const project = db.createProject('Test', 'desc');
    db.advancePhase(project.id);
    db.advancePhase(project.id);
    db.advancePhase(project.id);
    db.advancePhase(project.id); // should be no-op
    expect(db.getProject(project.id)?.phase).toBe('completed');
  });

  it('should list projects by phase', () => {
    db.createProject('A', 'desc');
    const b = db.createProject('B', 'desc');
    db.advancePhase(b.id);
    expect(db.getProjectsByPhase('explore')).toHaveLength(1);
    expect(db.getProjectsByPhase('build')).toHaveLength(1);
  });

  // ── Sessions & Messages ───────────────────────────────────────────────

  it('should create a session linked to a project', () => {
    const project = db.createProject('Test', 'desc');
    const session = db.createSession(project.id, 'explore');
    expect(session.project_id).toBe(project.id);
    expect(session.phase).toBe('explore');
  });

  it('should create a career session with null project_id', () => {
    const session = db.createSession(null, 'career');
    expect(session.project_id).toBeNull();
    expect(session.phase).toBe('career');
  });

  it('should add and retrieve messages', () => {
    const project = db.createProject('Test', 'desc');
    const session = db.createSession(project.id, 'explore');
    db.addMessage(session.id, 'user', 'Hello');
    db.addMessage(session.id, 'assistant', 'Hi there');
    const messages = db.getSessionMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
  });

  // ── Decisions ─────────────────────────────────────────────────────────

  it('should record a decision', () => {
    const project = db.createProject('Test', 'desc');
    const decision = db.addDecision(
      project.id,
      'Use React vs Vue',
      'React',
      [{ name: 'Vue', tradeoff: 'Simpler but smaller ecosystem' }],
      'More jobs, better TypeScript support'
    );
    expect(decision.title).toBe('Use React vs Vue');
    expect(decision.chosen).toBe('React');
  });

  it('should list decisions for a project', () => {
    const project = db.createProject('Test', 'desc');
    db.addDecision(project.id, 'Decision 1', 'A', [], 'Reason');
    db.addDecision(project.id, 'Decision 2', 'B', [], 'Reason');
    const decisions = db.getDecisions(project.id);
    expect(decisions).toHaveLength(2);
  });

  // ── Todos ─────────────────────────────────────────────────────────────

  it('should add and list todos', () => {
    const project = db.createProject('Test', 'desc');
    db.addTodo(project.id, 'Set up database', 1);
    db.addTodo(project.id, 'Write tests', 2);
    const todos = db.getTodos(project.id);
    expect(todos).toHaveLength(2);
    expect(todos[0].priority).toBe(1);
  });

  it('should update todo status', () => {
    const project = db.createProject('Test', 'desc');
    const todo = db.addTodo(project.id, 'Task', 1);
    db.updateTodoStatus(todo.id, 'done');
    const updated = db.getTodo(todo.id);
    expect(updated?.status).toBe('done');
    expect(updated?.completed_at).not.toBeNull();
  });

  // ── Achievements ──────────────────────────────────────────────────────

  it('should add an achievement', () => {
    const project = db.createProject('Test', 'desc');
    const achievement = db.addAchievement(
      project.id,
      'skill',
      'TypeScript',
      'Proficient in TypeScript with strict mode',
      [],
      ['TypeScript']
    );
    expect(achievement.category).toBe('skill');
    expect(achievement.title).toBe('TypeScript');
  });

  it('should add an achievement without a project (manual entry)', () => {
    const achievement = db.addAchievement(
      null,
      'achievement',
      'Led migration',
      'Led team of 5 in migrating from monolith to microservices',
      [],
      ['architecture', 'leadership']
    );
    expect(achievement.project_id).toBeNull();
  });

  it('should list achievements filtered by category', () => {
    const project = db.createProject('Test', 'desc');
    db.addAchievement(project.id, 'skill', 'TS', 'desc', [], ['ts']);
    db.addAchievement(project.id, 'achievement', 'Shipped', 'desc', [], []);
    db.addAchievement(project.id, 'skill', 'React', 'desc', [], ['react']);
    expect(db.getAchievementsByCategory('skill')).toHaveLength(2);
    expect(db.getAchievementsByCategory('achievement')).toHaveLength(1);
  });

  // ── Experiences ───────────────────────────────────────────────────────

  it('should add a past work experience', () => {
    const exp = db.addExperience(
      'Acme Corp',
      'Software Engineer',
      '2023-01 to 2024-06',
      'Built internal tools',
      ['Shipped dashboard used by 200 users'],
      []
    );
    expect(exp.company).toBe('Acme Corp');
    expect(exp.role).toBe('Software Engineer');
  });

  it('should list all experiences', () => {
    db.addExperience('A', 'Eng', '2023', 'desc', [], []);
    db.addExperience('B', 'Eng', '2024', 'desc', [], []);
    expect(db.getAllExperiences()).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/db/__tests__/database.test.ts
```

Expected: FAIL — `AthenaDB` module not found.

**Step 3: Create plugin/src/db/schema.sql (reference only)**

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  directory TEXT,
  phase TEXT NOT NULL DEFAULT 'explore'
    CHECK (phase IN ('explore', 'build', 'harvest', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  phase TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  summary TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  chosen TEXT NOT NULL,
  alternatives TEXT DEFAULT '[]',
  reasoning TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done')),
  priority INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  category TEXT NOT NULL
    CHECK (category IN ('skill', 'achievement', 'challenge', 'reflection')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  period TEXT NOT NULL,
  description TEXT NOT NULL,
  highlights TEXT DEFAULT '[]',
  recruiter_insights TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
CREATE INDEX IF NOT EXISTS idx_achievements_project ON achievements(project_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
```

**Step 4: Write the AthenaDB class**

Create `plugin/src/db/database.ts`:

```typescript
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

// ── Phase order ─────────────────────────────────────────────────────────────

const PHASE_ORDER = ['explore', 'build', 'harvest', 'completed'] as const;

// ── Schema ──────────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  directory TEXT,
  phase TEXT NOT NULL DEFAULT 'explore'
    CHECK (phase IN ('explore', 'build', 'harvest', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  phase TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  summary TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  chosen TEXT NOT NULL,
  alternatives TEXT DEFAULT '[]',
  reasoning TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done')),
  priority INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  category TEXT NOT NULL
    CHECK (category IN ('skill', 'achievement', 'challenge', 'reflection')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  period TEXT NOT NULL,
  description TEXT NOT NULL,
  highlights TEXT DEFAULT '[]',
  recruiter_insights TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
CREATE INDEX IF NOT EXISTS idx_achievements_project ON achievements(project_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
`;

// ── AthenaDB ────────────────────────────────────────────────────────────────

export class AthenaDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  listTables(): string[] {
    const rows = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  // ── Projects ──────────────────────────────────────────────────────────

  createProject(name: string, description: string, directory?: string): Project {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO projects (id, name, description, directory, phase, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, name, description, directory ?? null, 'explore', now, now);
    return this.getProject(id)!;
  }

  getProject(id: string): Project | undefined {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
  }

  getProjectsByPhase(phase: string): Project[] {
    return this.db
      .prepare('SELECT * FROM projects WHERE phase = ? ORDER BY updated_at DESC')
      .all(phase) as Project[];
  }

  getAllProjects(): Project[] {
    return this.db
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
      .all() as Project[];
  }

  advancePhase(projectId: string): void {
    const project = this.getProject(projectId);
    if (!project) return;
    const currentIndex = PHASE_ORDER.indexOf(project.phase as typeof PHASE_ORDER[number]);
    if (currentIndex < 0 || currentIndex >= PHASE_ORDER.length - 1) return;
    const nextPhase = PHASE_ORDER[currentIndex + 1];
    this.db
      .prepare('UPDATE projects SET phase = ?, updated_at = ? WHERE id = ?')
      .run(nextPhase, new Date().toISOString(), projectId);
  }

  updateProjectDirectory(projectId: string, directory: string): void {
    this.db
      .prepare('UPDATE projects SET directory = ?, updated_at = ? WHERE id = ?')
      .run(directory, new Date().toISOString(), projectId);
  }

  // ── Sessions ──────────────────────────────────────────────────────────

  createSession(projectId: string | null, phase: string): Session {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO sessions (id, project_id, phase, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(id, projectId, phase, now, now);
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session;
  }

  getSessionsForProject(projectId: string): Session[] {
    return this.db
      .prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY updated_at DESC')
      .all(projectId) as Session[];
  }

  getCareerSessions(): Session[] {
    return this.db
      .prepare("SELECT * FROM sessions WHERE project_id IS NULL ORDER BY updated_at DESC")
      .all() as Session[];
  }

  updateSessionSummary(sessionId: string, summary: string): void {
    this.db
      .prepare('UPDATE sessions SET summary = ?, updated_at = ? WHERE id = ?')
      .run(summary, new Date().toISOString(), sessionId);
  }

  // ── Messages ──────────────────────────────────────────────────────────

  addMessage(sessionId: string, role: string, content: string): Message {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO messages (id, session_id, role, content, created_at, is_deleted) VALUES (?, ?, ?, ?, ?, 0)'
      )
      .run(id, sessionId, role, content, now);
    return this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message;
  }

  getSessionMessages(sessionId: string): Message[] {
    return this.db
      .prepare(
        'SELECT * FROM messages WHERE session_id = ? AND is_deleted = 0 ORDER BY created_at ASC'
      )
      .all(sessionId) as Message[];
  }

  // ── Decisions ─────────────────────────────────────────────────────────

  addDecision(
    projectId: string,
    title: string,
    chosen: string,
    alternatives: Array<{ name: string; tradeoff: string }>,
    reasoning: string
  ): Decision {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO decisions (id, project_id, title, chosen, alternatives, reasoning, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, projectId, title, chosen, JSON.stringify(alternatives), reasoning, now);
    return this.db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as Decision;
  }

  getDecisions(projectId: string): Decision[] {
    return this.db
      .prepare('SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at ASC')
      .all(projectId) as Decision[];
  }

  // ── Todos ─────────────────────────────────────────────────────────────

  addTodo(projectId: string, title: string, priority: number = 2): Todo {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO todos (id, project_id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, projectId, title, 'pending', priority, now);
    return this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo;
  }

  getTodo(id: string): Todo | undefined {
    return this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
  }

  getTodos(projectId: string): Todo[] {
    return this.db
      .prepare('SELECT * FROM todos WHERE project_id = ? ORDER BY priority ASC, created_at ASC')
      .all(projectId) as Todo[];
  }

  updateTodoStatus(todoId: string, status: string): void {
    const completedAt = status === 'done' ? new Date().toISOString() : null;
    this.db
      .prepare('UPDATE todos SET status = ?, completed_at = ? WHERE id = ?')
      .run(status, completedAt, todoId);
  }

  // ── Achievements ──────────────────────────────────────────────────────

  addAchievement(
    projectId: string | null,
    category: string,
    title: string,
    description: string,
    evidence: Array<{ type: string; ref: string }>,
    tags: string[]
  ): Achievement {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO achievements (id, project_id, category, title, description, evidence, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, projectId, category, title, description, JSON.stringify(evidence), JSON.stringify(tags), now);
    return this.db.prepare('SELECT * FROM achievements WHERE id = ?').get(id) as Achievement;
  }

  getAchievementsByCategory(category: string): Achievement[] {
    return this.db
      .prepare('SELECT * FROM achievements WHERE category = ? ORDER BY created_at DESC')
      .all(category) as Achievement[];
  }

  getAchievementsForProject(projectId: string): Achievement[] {
    return this.db
      .prepare('SELECT * FROM achievements WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as Achievement[];
  }

  getAllAchievements(): Achievement[] {
    return this.db
      .prepare('SELECT * FROM achievements ORDER BY category, created_at DESC')
      .all() as Achievement[];
  }

  // ── Experiences ───────────────────────────────────────────────────────

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
    this.db
      .prepare(
        'INSERT INTO experiences (id, company, role, period, description, highlights, recruiter_insights, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, company, role, period, description, JSON.stringify(highlights), JSON.stringify(recruiterInsights), now, now);
    return this.db.prepare('SELECT * FROM experiences WHERE id = ?').get(id) as Experience;
  }

  getAllExperiences(): Experience[] {
    return this.db
      .prepare('SELECT * FROM experiences ORDER BY created_at DESC')
      .all() as Experience[];
  }

  updateExperienceInsights(experienceId: string, insights: string[]): void {
    this.db
      .prepare('UPDATE experiences SET recruiter_insights = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(insights), new Date().toISOString(), experienceId);
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  getProjectCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    return row.count;
  }

  getAchievementCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM achievements').get() as { count: number };
    return row.count;
  }
}
```

**Step 5: Run test to verify it passes**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/db/__tests__/database.test.ts
```

Expected: all 20 tests PASS.

**Step 6: Commit**

```bash
cd ~/Desktop/athena
git add plugin/src/db/
git commit -m "feat: add AthenaDB with 7-table schema and full CRUD operations"
```

---

## Task 3: Project Tools (create, list, open, advance, scan)

**Files:**
- Create: `plugin/src/projects/manager.ts`
- Create: `plugin/src/projects/__tests__/manager.test.ts`

**Step 1: Write the failing test**

Create `plugin/src/projects/__tests__/manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectManager } from '../manager.js';
import { AthenaDB } from '../../db/database.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DB = path.join(__dirname, 'test-projects.db');

describe('ProjectManager', () => {
  let db: AthenaDB;
  let manager: ProjectManager;

  beforeEach(() => {
    db = new AthenaDB(TEST_DB);
    manager = new ProjectManager(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should create a project and return confirmation', async () => {
    const result = await manager.create({ name: 'My App', description: 'A web app' });
    expect(result.content).toContain('My App');
    expect(result.content).toContain('explore');
  });

  it('should create a project with linked directory', async () => {
    const dir = os.tmpdir();
    const result = await manager.create({ name: 'CLI', description: 'Tool', directory: dir });
    expect(result.content).toContain(dir);
  });

  it('should list projects grouped by phase', async () => {
    const p1 = db.createProject('A', 'desc');
    db.createProject('B', 'desc');
    db.advancePhase(p1.id);
    const result = await manager.list();
    expect(result.content).toContain('explore');
    expect(result.content).toContain('build');
    expect(result.content).toContain('A');
    expect(result.content).toContain('B');
  });

  it('should open a project by name search', async () => {
    db.createProject('React Dashboard', 'desc');
    const result = await manager.open({ query: 'React' });
    expect(result.content).toContain('React Dashboard');
    expect(result.content).toContain('explore');
  });

  it('should return error for unknown project', async () => {
    const result = await manager.open({ query: 'nonexistent' });
    expect(result.error).toBe('project_not_found');
  });

  it('should advance project phase', async () => {
    const project = db.createProject('Test', 'desc');
    const result = await manager.advance({ project_id: project.id });
    expect(result.content).toContain('build');
  });

  it('should scan a linked directory', async () => {
    // Create a temp directory for scanning
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-test-'));
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test Project\nA test.');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', dependencies: { express: '4.0' } }));

    const project = db.createProject('Test', 'desc', tmpDir);
    const result = await manager.scan({ project_id: project.id });
    expect(result.content).toContain('README.md');
    expect(result.content).toContain('express');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should return error when scanning project with no directory', async () => {
    const project = db.createProject('Test', 'desc');
    const result = await manager.scan({ project_id: project.id });
    expect(result.error).toBe('no_directory');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/projects/__tests__/manager.test.ts
```

Expected: FAIL — `ProjectManager` module not found.

**Step 3: Write the ProjectManager**

Create `plugin/src/projects/manager.ts`:

```typescript
import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class ProjectManager {
  constructor(private db: AthenaDB) {}

  async create(params: {
    name: string;
    description: string;
    directory?: string;
  }): Promise<ToolResult> {
    const project = this.db.createProject(params.name, params.description, params.directory);
    const lines = [
      `**Project created: ${project.name}**`,
      `- **ID:** ${project.id}`,
      `- **Phase:** ${project.phase}`,
      `- **Description:** ${project.description}`,
    ];
    if (project.directory) {
      lines.push(`- **Directory:** ${project.directory}`);
    }
    return { content: lines.join('\n') };
  }

  async list(): Promise<ToolResult> {
    const all = this.db.getAllProjects();
    if (all.length === 0) {
      return { content: 'No projects yet.' };
    }

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
      return {
        content: `No project found matching "${params.query}".`,
        error: 'project_not_found',
      };
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

    if (match.directory) {
      lines.push(`- **Directory:** ${match.directory}`);
    }

    return { content: lines.join('\n') };
  }

  async advance(params: { project_id: string }): Promise<ToolResult> {
    const before = this.db.getProject(params.project_id);
    if (!before) {
      return { content: 'Project not found.', error: 'project_not_found' };
    }

    if (before.phase === 'completed') {
      return { content: `Project "${before.name}" is already completed.`, error: 'already_completed' };
    }

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
    if (!project) {
      return { content: 'Project not found.', error: 'project_not_found' };
    }
    if (!project.directory) {
      return {
        content: `Project "${project.name}" has no linked directory. Use athena_project_create with a directory path.`,
        error: 'no_directory',
      };
    }
    if (!fs.existsSync(project.directory)) {
      return {
        content: `Directory not found: ${project.directory}`,
        error: 'directory_not_found',
      };
    }

    const sections: string[] = [`**Project scan: ${project.name}**`, `Directory: ${project.directory}`, ''];

    // File listing (top-level)
    const files = fs.readdirSync(project.directory);
    sections.push('**Files:**');
    for (const f of files.filter((f) => !f.startsWith('.'))) {
      sections.push(`  - ${f}`);
    }
    sections.push('');

    // README
    const readmePath = path.join(project.directory, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf-8');
      const preview = readme.split('\n').slice(0, 20).join('\n');
      sections.push('**README.md (first 20 lines):**');
      sections.push(preview);
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
      } catch {
        // Skip malformed package.json
      }
    }

    // Git log (last 10 commits) — uses execFileSync to avoid shell injection
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
    } catch {
      // Not a git repo or git not available
    }

    return { content: sections.join('\n') };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/projects/__tests__/manager.test.ts
```

Expected: all 8 tests PASS.

**Step 5: Commit**

```bash
cd ~/Desktop/athena
git add plugin/src/projects/
git commit -m "feat: add ProjectManager with create, list, open, advance, and scan"
```

---

## Task 4: Build Tools (todo add, update, list) and Decision Recording

**Files:**
- Create: `plugin/src/tools/build-tools.ts`
- Create: `plugin/src/tools/__tests__/build-tools.test.ts`

**Step 1: Write the failing test**

Create `plugin/src/tools/__tests__/build-tools.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuildTools } from '../build-tools.js';
import { AthenaDB } from '../../db/database.js';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.join(__dirname, 'test-build.db');

describe('BuildTools', () => {
  let db: AthenaDB;
  let tools: BuildTools;
  let projectId: string;

  beforeEach(() => {
    db = new AthenaDB(TEST_DB);
    tools = new BuildTools(db);
    projectId = db.createProject('Test Project', 'desc').id;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should record a decision with alternatives', async () => {
    const result = await tools.recordDecision({
      project_id: projectId,
      title: 'Database choice',
      chosen: 'SQLite',
      alternatives_json: JSON.stringify([
        { name: 'PostgreSQL', tradeoff: 'More powerful but requires server' },
      ]),
      reasoning: 'Local-first, no server needed',
    });
    expect(result.content).toContain('Database choice');
    expect(result.content).toContain('SQLite');
    expect(result.content).toContain('PostgreSQL');
  });

  it('should add a todo', async () => {
    const result = await tools.addTodo({
      project_id: projectId,
      title: 'Set up CI',
      priority: '1',
    });
    expect(result.content).toContain('Set up CI');
    expect(result.content).toContain('high');
  });

  it('should update todo status', async () => {
    const todo = db.addTodo(projectId, 'Write tests', 1);
    const result = await tools.updateTodo({
      todo_id: todo.id,
      status: 'done',
    });
    expect(result.content).toContain('done');
    expect(result.content).toContain('Write tests');
  });

  it('should list todos for a project', async () => {
    db.addTodo(projectId, 'Task A', 1);
    db.addTodo(projectId, 'Task B', 2);
    const done = db.addTodo(projectId, 'Task C', 3);
    db.updateTodoStatus(done.id, 'done');

    const result = await tools.listTodos({ project_id: projectId });
    expect(result.content).toContain('Task A');
    expect(result.content).toContain('Task B');
    expect(result.content).toContain('Task C');
    expect(result.content).toContain('done');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/tools/__tests__/build-tools.test.ts
```

Expected: FAIL — `BuildTools` module not found.

**Step 3: Write BuildTools**

Create `plugin/src/tools/build-tools.ts`:

```typescript
import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';

const PRIORITY_LABELS: Record<number, string> = { 1: 'high', 2: 'medium', 3: 'low' };

export class BuildTools {
  constructor(private db: AthenaDB) {}

  async recordDecision(params: {
    project_id: string;
    title: string;
    chosen: string;
    alternatives_json: string;
    reasoning: string;
  }): Promise<ToolResult> {
    let alternatives: Array<{ name: string; tradeoff: string }> = [];
    try {
      alternatives = JSON.parse(params.alternatives_json);
    } catch {
      alternatives = [];
    }

    const decision = this.db.addDecision(
      params.project_id,
      params.title,
      params.chosen,
      alternatives,
      params.reasoning
    );

    const lines = [
      `**Decision recorded: ${decision.title}**`,
      `- **Chosen:** ${decision.chosen}`,
      `- **Reasoning:** ${params.reasoning}`,
    ];

    if (alternatives.length > 0) {
      lines.push('- **Alternatives considered:**');
      for (const alt of alternatives) {
        lines.push(`  - ${alt.name}: ${alt.tradeoff}`);
      }
    }

    return { content: lines.join('\n') };
  }

  async addTodo(params: {
    project_id: string;
    title: string;
    priority?: string;
  }): Promise<ToolResult> {
    const priority = params.priority ? parseInt(params.priority, 10) : 2;
    const todo = this.db.addTodo(params.project_id, params.title, priority);
    return {
      content: [
        `**Todo added**`,
        `- **Title:** ${todo.title}`,
        `- **Priority:** ${PRIORITY_LABELS[todo.priority] || todo.priority}`,
        `- **Status:** ${todo.status}`,
        `- **ID:** ${todo.id}`,
      ].join('\n'),
    };
  }

  async updateTodo(params: {
    todo_id: string;
    status: string;
  }): Promise<ToolResult> {
    const todo = this.db.getTodo(params.todo_id);
    if (!todo) {
      return { content: 'Todo not found.', error: 'todo_not_found' };
    }

    this.db.updateTodoStatus(params.todo_id, params.status);

    return {
      content: [
        `**Todo updated: ${todo.title}**`,
        `- **Status:** ${params.status}`,
      ].join('\n'),
    };
  }

  async listTodos(params: { project_id: string }): Promise<ToolResult> {
    const todos = this.db.getTodos(params.project_id);
    if (todos.length === 0) {
      return { content: 'No todos for this project.' };
    }

    const lines: string[] = [`**Todos (${todos.length})**`, ''];

    for (const todo of todos) {
      const check = todo.status === 'done' ? '[x]' : '[ ]';
      const label = PRIORITY_LABELS[todo.priority] || `p${todo.priority}`;
      lines.push(`${check} **${todo.title}** (${label}) — ${todo.status}`);
    }

    const done = todos.filter((t) => t.status === 'done').length;
    lines.push('');
    lines.push(`Progress: ${done}/${todos.length} complete`);

    return { content: lines.join('\n') };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/tools/__tests__/build-tools.test.ts
```

Expected: all 4 tests PASS.

**Step 5: Commit**

```bash
cd ~/Desktop/athena
git add plugin/src/tools/build-tools.ts plugin/src/tools/__tests__/build-tools.test.ts
git commit -m "feat: add BuildTools with decision recording and todo management"
```

---

## Task 5: Career Tools (harvester, achievement bank, experience management)

**Files:**
- Create: `plugin/src/career/harvester.ts`
- Create: `plugin/src/career/coach.ts`
- Create: `plugin/src/career/__tests__/career.test.ts`

**Step 1: Write the failing test**

Create `plugin/src/career/__tests__/career.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Harvester } from '../harvester.js';
import { CareerCoach } from '../coach.js';
import { AthenaDB } from '../../db/database.js';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.join(__dirname, 'test-career.db');

describe('Harvester', () => {
  let db: AthenaDB;
  let harvester: Harvester;
  let projectId: string;

  beforeEach(() => {
    db = new AthenaDB(TEST_DB);
    harvester = new Harvester(db);
    projectId = db.createProject('Test Project', 'A web app').id;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should build a harvest prompt with project context', () => {
    db.addDecision(projectId, 'Use React', 'React', [], 'Better ecosystem');
    db.addTodo(projectId, 'Set up CI', 1);
    const todo = db.addTodo(projectId, 'Write tests', 2);
    db.updateTodoStatus(todo.id, 'done');

    const prompt = harvester.buildHarvestPrompt(projectId);
    expect(prompt).toContain('Test Project');
    expect(prompt).toContain('Use React');
    expect(prompt).toContain('Set up CI');
    expect(prompt).toContain('Write tests');
  });

  it('should apply harvest results to achievement bank', () => {
    const harvestJson = JSON.stringify({
      achievements: [
        {
          category: 'skill',
          title: 'React',
          description: 'Built a dashboard with React and TypeScript',
          tags: ['React', 'TypeScript'],
        },
        {
          category: 'achievement',
          title: 'Shipped MVP',
          description: 'Delivered MVP in 2 weeks, serving 50 users',
          tags: ['delivery'],
        },
      ],
    });

    harvester.applyHarvest(projectId, harvestJson);
    const achievements = db.getAllAchievements();
    expect(achievements).toHaveLength(2);
    expect(achievements[0].title).toBe('React');
    expect(achievements[1].title).toBe('Shipped MVP');
  });
});

describe('CareerCoach', () => {
  let db: AthenaDB;
  let coach: CareerCoach;

  beforeEach(() => {
    db = new AthenaDB(TEST_DB);
    coach = new CareerCoach(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should add a past experience', async () => {
    const result = await coach.addExperience({
      company: 'Acme Corp',
      role: 'Software Engineer',
      period: '2023-01 to 2024-06',
      description: 'Built internal tools and APIs',
      highlights_json: JSON.stringify(['Shipped dashboard used by 200 users']),
    });
    expect(result.content).toContain('Acme Corp');
    expect(result.content).toContain('Software Engineer');
  });

  it('should list achievements from the bank', async () => {
    const project = db.createProject('P', 'desc');
    db.addAchievement(project.id, 'skill', 'TypeScript', 'Proficient in TS', [], ['TypeScript']);
    db.addAchievement(null, 'achievement', 'Led migration', 'Led team migration', [], ['leadership']);

    const result = await coach.listAchievements({});
    expect(result.content).toContain('TypeScript');
    expect(result.content).toContain('Led migration');
  });

  it('should filter achievements by category', async () => {
    const project = db.createProject('P', 'desc');
    db.addAchievement(project.id, 'skill', 'React', 'desc', [], []);
    db.addAchievement(project.id, 'challenge', 'Debugging prod', 'desc', [], []);

    const result = await coach.listAchievements({ category: 'skill' });
    expect(result.content).toContain('React');
    expect(result.content).not.toContain('Debugging prod');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/career/__tests__/career.test.ts
```

Expected: FAIL — modules not found.

**Step 3: Write the Harvester**

Create `plugin/src/career/harvester.ts`:

```typescript
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
- Write descriptions in recruiter-ready language: "Reduced API latency 40% by implementing Redis caching" not "Worked on caching".
- Extract 3-8 items per project. Quality over quantity.`;

export class Harvester {
  constructor(private db: AthenaDB) {}

  buildHarvestPrompt(projectId: string): string {
    const project = this.db.getProject(projectId);
    if (!project) return 'Project not found.';

    const decisions = this.db.getDecisions(projectId);
    const todos = this.db.getTodos(projectId);

    const sections: string[] = [
      HARVEST_SYSTEM_PROMPT,
      '',
      '--- Project Context ---',
      `Project: ${project.name}`,
      `Description: ${project.description}`,
    ];

    if (project.directory) {
      sections.push(`Directory: ${project.directory}`);
    }

    if (decisions.length > 0) {
      sections.push('');
      sections.push('Key decisions made:');
      for (const d of decisions) {
        sections.push(`- ${d.title}: chose "${d.chosen}" because ${d.reasoning}`);
      }
    }

    if (todos.length > 0) {
      sections.push('');
      sections.push('Tasks:');
      for (const t of todos) {
        sections.push(`- [${t.status}] ${t.title}`);
      }
    }

    sections.push('');
    sections.push('Extract achievements from this project.');

    return sections.join('\n');
  }

  applyHarvest(projectId: string, jsonResult: string): void {
    const parsed: HarvestResult = JSON.parse(jsonResult);
    for (const entry of parsed.achievements) {
      this.db.addAchievement(
        projectId,
        entry.category,
        entry.title,
        entry.description,
        [],
        entry.tags
      );
    }
  }
}
```

**Step 4: Write the CareerCoach**

Create `plugin/src/career/coach.ts`:

```typescript
import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';

export class CareerCoach {
  constructor(private db: AthenaDB) {}

  async addExperience(params: {
    company: string;
    role: string;
    period: string;
    description: string;
    highlights_json?: string;
  }): Promise<ToolResult> {
    let highlights: string[] = [];
    if (params.highlights_json) {
      try {
        highlights = JSON.parse(params.highlights_json);
      } catch {
        highlights = [];
      }
    }

    const exp = this.db.addExperience(
      params.company,
      params.role,
      params.period,
      params.description,
      highlights,
      []
    );

    const lines = [
      `**Experience added**`,
      `- **Company:** ${exp.company}`,
      `- **Role:** ${exp.role}`,
      `- **Period:** ${params.period}`,
      `- **Description:** ${params.description}`,
    ];

    if (highlights.length > 0) {
      lines.push('- **Highlights:**');
      for (const h of highlights) {
        lines.push(`  - ${h}`);
      }
    }

    return { content: lines.join('\n') };
  }

  async listAchievements(params: {
    category?: string;
    project_id?: string;
  }): Promise<ToolResult> {
    let achievements;
    if (params.category) {
      achievements = this.db.getAchievementsByCategory(params.category);
    } else if (params.project_id) {
      achievements = this.db.getAchievementsForProject(params.project_id);
    } else {
      achievements = this.db.getAllAchievements();
    }

    if (achievements.length === 0) {
      return { content: 'No achievements in the bank yet.' };
    }

    const lines: string[] = [`**Achievement Bank (${achievements.length})**`, ''];

    // Group by category
    const grouped: Record<string, typeof achievements> = {};
    for (const a of achievements) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    for (const [category, items] of Object.entries(grouped)) {
      lines.push(`### ${category} (${items.length})`);
      for (const item of items) {
        let tags = '';
        try {
          const parsed = JSON.parse(item.tags);
          if (parsed.length > 0) tags = ` [${parsed.join(', ')}]`;
        } catch {}
        lines.push(`- **${item.title}**: ${item.description}${tags}`);
      }
      lines.push('');
    }

    return { content: lines.join('\n') };
  }
}
```

**Step 5: Run test to verify it passes**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/career/__tests__/career.test.ts
```

Expected: all 5 tests PASS.

**Step 6: Commit**

```bash
cd ~/Desktop/athena
git add plugin/src/career/
git commit -m "feat: add Harvester and CareerCoach for achievement extraction and experience management"
```

---

## Task 6: Resume Engine (generate and review)

**Files:**
- Create: `plugin/src/career/resume.ts`
- Create: `plugin/src/career/__tests__/resume.test.ts`

**Step 1: Write the failing test**

Create `plugin/src/career/__tests__/resume.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResumeEngine } from '../resume.js';
import { AthenaDB } from '../../db/database.js';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.join(__dirname, 'test-resume.db');

describe('ResumeEngine', () => {
  let db: AthenaDB;
  let engine: ResumeEngine;

  beforeEach(() => {
    db = new AthenaDB(TEST_DB);
    engine = new ResumeEngine(db);

    // Seed data
    const project = db.createProject('Dashboard', 'React dashboard');
    db.addAchievement(project.id, 'skill', 'React', 'Built interactive dashboards with React', [], ['React', 'TypeScript']);
    db.addAchievement(project.id, 'achievement', 'Shipped MVP', 'Delivered MVP in 2 weeks serving 50 daily users', [], ['delivery']);
    db.addAchievement(null, 'skill', 'Node.js', 'Built REST APIs with Express and Node.js', [], ['Node.js', 'Express']);

    db.addExperience('Acme Corp', 'Software Engineer', '2023-01 to 2024-06', 'Built internal tools', ['Shipped dashboard for 200 users'], []);
    db.addExperience('StartupX', 'Intern', '2022-06 to 2022-12', 'Frontend development', ['Built onboarding flow'], []);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('should build a resume generation prompt with all data', () => {
    const prompt = engine.buildGeneratePrompt();
    expect(prompt).toContain('React');
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('StartupX');
    expect(prompt).toContain('Shipped MVP');
  });

  it('should build a review prompt for existing resume text', () => {
    const resumeText = `# John Doe\n## Experience\n- Worked at Acme Corp\n- Helped with backend`;
    const prompt = engine.buildReviewPrompt(resumeText);
    expect(prompt).toContain('Worked at Acme Corp');
    expect(prompt).toContain('Achievement Bank');
    expect(prompt).toContain('React');
  });

  it('should include resume knowledge in prompts', () => {
    const prompt = engine.buildGeneratePrompt();
    expect(prompt).toContain('impact verb');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/career/__tests__/resume.test.ts
```

Expected: FAIL — `ResumeEngine` module not found.

**Step 3: Write the ResumeEngine**

Create `plugin/src/career/resume.ts`:

```typescript
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
        try {
          const parsed = JSON.parse(a.tags);
          if (parsed.length) tags = ` [${parsed.join(', ')}]`;
        } catch {}
        sections.push(`- [${a.category}] **${a.title}**: ${a.description}${tags}`);
      }
      sections.push('');
    }

    if (experiences.length > 0) {
      sections.push('## Work Experience');
      for (const exp of experiences) {
        sections.push(`### ${exp.role} at ${exp.company} (${exp.period})`);
        sections.push(exp.description);
        try {
          const highlights = JSON.parse(exp.highlights);
          for (const h of highlights) {
            sections.push(`- ${h}`);
          }
        } catch {}
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
        try {
          const parsed = JSON.parse(a.tags);
          if (parsed.length) tags = ` [${parsed.join(', ')}]`;
        } catch {}
        sections.push(`- [${a.category}] **${a.title}**: ${a.description}${tags}`);
      }
    }

    sections.push('');
    sections.push('Review this resume and provide specific feedback.');
    return sections.join('\n');
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd ~/Desktop/athena/plugin && npx vitest run src/career/__tests__/resume.test.ts
```

Expected: all 3 tests PASS.

**Step 5: Commit**

```bash
cd ~/Desktop/athena
git add plugin/src/career/resume.ts plugin/src/career/__tests__/resume.test.ts
git commit -m "feat: add ResumeEngine with generation and review prompt building"
```

---

## Task 7: Tool Registration (all 14 tools)

**Files:**
- Create: `plugin/src/tools/register.ts`
- Create: `plugin/src/tools/project-tools.ts`
- Create: `plugin/src/tools/career-tools.ts`

**Step 1: Create plugin/src/tools/project-tools.ts**

```typescript
import { ProjectManager } from '../projects/manager.js';
import type { PluginAPI } from '../types.js';

export function registerProjectTools(api: PluginAPI, manager: ProjectManager): void {
  api.registerTool({
    name: 'athena_project_create',
    description: 'Create a new project to track. Optionally link to a local directory for code scanning.',
    parameters: {
      name: { type: 'string', description: 'Project name', required: true },
      description: { type: 'string', description: 'What this project is about', required: true },
      directory: { type: 'string', description: 'Absolute path to the project directory (optional)' },
    },
    run: async (params) => manager.create({
      name: params.name as string,
      description: params.description as string,
      directory: params.directory as string | undefined,
    }),
  });

  api.registerTool({
    name: 'athena_project_list',
    description: 'List all projects grouped by phase (explore, build, harvest, completed)',
    parameters: {},
    run: async () => manager.list(),
  });

  api.registerTool({
    name: 'athena_project_open',
    description: 'Open a project by searching for it by name',
    parameters: {
      query: { type: 'string', description: 'Search query to find the project by name', required: true },
    },
    run: async (params) => manager.open({ query: params.query as string }),
  });

  api.registerTool({
    name: 'athena_project_advance',
    description: 'Advance a project to the next phase (explore → build → harvest → completed)',
    parameters: {
      project_id: { type: 'string', description: 'ID of the project to advance', required: true },
    },
    run: async (params) => manager.advance({ project_id: params.project_id as string }),
  });

  api.registerTool({
    name: 'athena_project_scan',
    description: "Scan a project's linked directory for README, dependencies, git history, and file structure",
    parameters: {
      project_id: { type: 'string', description: 'ID of the project to scan', required: true },
    },
    run: async (params) => manager.scan({ project_id: params.project_id as string }),
  });
}
```

**Step 2: Create plugin/src/tools/career-tools.ts**

```typescript
import { Harvester } from '../career/harvester.js';
import { CareerCoach } from '../career/coach.js';
import { ResumeEngine } from '../career/resume.js';
import type { PluginAPI, ToolResult } from '../types.js';

export function registerCareerTools(
  api: PluginAPI,
  harvester: Harvester,
  coach: CareerCoach,
  resume: ResumeEngine
): void {
  api.registerTool({
    name: 'athena_harvest',
    description: 'Extract skills, achievements, challenges, and reflections from a project. Call this when a project reaches the harvest phase.',
    parameters: {
      project_id: { type: 'string', description: 'ID of the project to harvest', required: true },
      harvest_json: {
        type: 'string',
        description: 'JSON string with harvest results (from Claude analysis). If not provided, returns a prompt to generate harvest data.',
      },
    },
    run: async (params): Promise<ToolResult> => {
      const projectId = params.project_id as string;
      if (params.harvest_json) {
        harvester.applyHarvest(projectId, params.harvest_json as string);
        return { content: 'Harvest applied to achievement bank.' };
      }
      const prompt = harvester.buildHarvestPrompt(projectId);
      return { content: prompt };
    },
  });

  api.registerTool({
    name: 'athena_achievement_list',
    description: 'Query the achievement bank. Optionally filter by category (skill, achievement, challenge, reflection) or project.',
    parameters: {
      category: { type: 'string', description: 'Filter by category', enum: ['skill', 'achievement', 'challenge', 'reflection'] },
      project_id: { type: 'string', description: 'Filter by project ID' },
    },
    run: async (params) => coach.listAchievements({
      category: params.category as string | undefined,
      project_id: params.project_id as string | undefined,
    }),
  });

  api.registerTool({
    name: 'athena_experience_add',
    description: 'Add a past work experience (company, role, period, description, highlights)',
    parameters: {
      company: { type: 'string', description: 'Company name', required: true },
      role: { type: 'string', description: 'Job title', required: true },
      period: { type: 'string', description: 'Time period, e.g. "2023-01 to 2024-06"', required: true },
      description: { type: 'string', description: 'What you did there', required: true },
      highlights_json: { type: 'string', description: 'JSON array of key accomplishments' },
    },
    run: async (params) => coach.addExperience({
      company: params.company as string,
      role: params.role as string,
      period: params.period as string,
      description: params.description as string,
      highlights_json: params.highlights_json as string | undefined,
    }),
  });

  api.registerTool({
    name: 'athena_resume_generate',
    description: 'Generate a resume from your achievement bank and work experiences. Returns a prompt for Claude to produce the resume.',
    parameters: {},
    run: async (): Promise<ToolResult> => {
      const prompt = resume.buildGeneratePrompt();
      return { content: prompt };
    },
  });

  api.registerTool({
    name: 'athena_resume_review',
    description: 'Review and polish an existing resume against best practices. Compares with your achievement bank for missed opportunities.',
    parameters: {
      resume_text: { type: 'string', description: 'The resume text to review', required: true },
    },
    run: async (params): Promise<ToolResult> => {
      const prompt = resume.buildReviewPrompt(params.resume_text as string);
      return { content: prompt };
    },
  });
}
```

**Step 3: Create plugin/src/tools/register.ts**

```typescript
import path from 'path';
import os from 'os';
import { AthenaDB } from '../db/database.js';
import { ProjectManager } from '../projects/manager.js';
import { BuildTools } from './build-tools.js';
import { Harvester } from '../career/harvester.js';
import { CareerCoach } from '../career/coach.js';
import { ResumeEngine } from '../career/resume.js';
import { registerProjectTools } from './project-tools.js';
import { registerCareerTools } from './career-tools.js';
import type { PluginAPI } from '../types.js';

export function registerAllTools(api: PluginAPI): void {
  const dbPath = path.join(os.homedir(), '.athena', 'athena.db');
  const db = new AthenaDB(dbPath);

  const manager = new ProjectManager(db);
  const buildTools = new BuildTools(db);
  const harvester = new Harvester(db);
  const coach = new CareerCoach(db);
  const resume = new ResumeEngine(db);

  // ── Project Tools (5) ───────────────────────────────────────────────
  registerProjectTools(api, manager);

  // ── Build Tools (4) ─────────────────────────────────────────────────

  api.registerTool({
    name: 'athena_decision_record',
    description: 'Record a key decision with the chosen approach, alternatives considered, and reasoning',
    parameters: {
      project_id: { type: 'string', description: 'ID of the project', required: true },
      title: { type: 'string', description: 'What was decided', required: true },
      chosen: { type: 'string', description: 'The chosen approach', required: true },
      alternatives_json: { type: 'string', description: 'JSON array of {name, tradeoff} objects for alternatives' },
      reasoning: { type: 'string', description: 'Why this choice was made', required: true },
    },
    run: async (params) => buildTools.recordDecision({
      project_id: params.project_id as string,
      title: params.title as string,
      chosen: params.chosen as string,
      alternatives_json: (params.alternatives_json as string) || '[]',
      reasoning: params.reasoning as string,
    }),
  });

  api.registerTool({
    name: 'athena_todo_add',
    description: 'Add a todo item to a project',
    parameters: {
      project_id: { type: 'string', description: 'ID of the project', required: true },
      title: { type: 'string', description: 'Task description', required: true },
      priority: { type: 'string', description: 'Priority: 1 (high), 2 (medium), 3 (low). Default: 2' },
    },
    run: async (params) => buildTools.addTodo({
      project_id: params.project_id as string,
      title: params.title as string,
      priority: params.priority as string | undefined,
    }),
  });

  api.registerTool({
    name: 'athena_todo_update',
    description: 'Update the status of a todo item',
    parameters: {
      todo_id: { type: 'string', description: 'ID of the todo', required: true },
      status: { type: 'string', description: 'New status', required: true, enum: ['pending', 'in_progress', 'done'] },
    },
    run: async (params) => buildTools.updateTodo({
      todo_id: params.todo_id as string,
      status: params.status as string,
    }),
  });

  api.registerTool({
    name: 'athena_todo_list',
    description: 'List all todos for a project with progress summary',
    parameters: {
      project_id: { type: 'string', description: 'ID of the project', required: true },
    },
    run: async (params) => buildTools.listTodos({ project_id: params.project_id as string }),
  });

  // ── Career Tools (5) ────────────────────────────────────────────────
  registerCareerTools(api, harvester, coach, resume);
}
```

**Step 4: Update plugin/src/index.ts**

```typescript
import type { PluginAPI } from './types.js';
import { registerAllTools } from './tools/register.js';

export const id = 'athena';
export const name = 'Athena - Strategic Career Engineer';

export function register(api: PluginAPI) {
  registerAllTools(api);
  console.log('[Athena] Plugin loaded successfully');
}
```

**Step 5: Verify build compiles**

```bash
cd ~/Desktop/athena/plugin && npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
cd ~/Desktop/athena
git add plugin/src/tools/ plugin/src/index.ts
git commit -m "feat: register all 14 tools with OpenClaw plugin API"
```

---

## Task 8: Workspace Files

**Files:**
- Create: `workspace/IDENTITY.md`
- Create: `workspace/SOUL.md`
- Create: `workspace/AGENTS.md`
- Create: `workspace/USER.md`
- Create: `workspace/RESUME_KNOWLEDGE.md`

**Step 1: Create all workspace files**

See the design document for full content of each file:
- `IDENTITY.md` — name and tagline
- `SOUL.md` — strategic career engineer persona with phase-specific behavior
- `AGENTS.md` — operating instructions and tool usage guide
- `USER.md` — user customization template
- `RESUME_KNOWLEDGE.md` — comprehensive resume best practices

Refer to the design doc at `docs/plans/2026-03-06-athena-design.md` for exact content.

**Step 2: Commit**

```bash
cd ~/Desktop/athena
git add workspace/
git commit -m "feat: add workspace files — persona, operating instructions, resume knowledge base"
```

---

## Task 9: Slash Command Skills

**Files:**
- Create: `plugin/skills/project/SKILL.md`
- Create: `plugin/skills/harvest/SKILL.md`
- Create: `plugin/skills/resume/SKILL.md`

**Step 1: Create plugin/skills/project/SKILL.md**

```markdown
---
name: project
description: Manage projects — create, list, open, advance phase, or scan linked directory
---

When the user invokes /project, determine the subcommand from context:

- `/project new <name>` → Call `athena_project_create` with the name. Ask for description and optional directory.
- `/project list` → Call `athena_project_list`
- `/project open <query>` → Call `athena_project_open` with the search query
- `/project advance` → Call `athena_project_advance` for the current project. Confirm the phase transition first.
- `/project scan` → Call `athena_project_scan` for the current project
- `/project` (no subcommand) → Show available subcommands
```

**Step 2: Create plugin/skills/harvest/SKILL.md**

```markdown
---
name: harvest
description: Extract achievements, skills, challenges, and reflections from the current project
---

When the user invokes /harvest:

1. Call `athena_project_list` to identify the current project
2. Call `athena_harvest` with the project ID (no harvest_json) to get the harvest prompt
3. Use the prompt to analyze the project and generate harvest JSON
4. Call `athena_harvest` again with the harvest_json to store results
5. Call `athena_achievement_list` filtered to this project to show what was extracted
6. Suggest advancing the project to completed phase
```

**Step 3: Create plugin/skills/resume/SKILL.md**

```markdown
---
name: resume
description: Generate or review a resume using your achievement bank and work experiences
---

When the user invokes /resume, determine the subcommand:

- `/resume generate` → Call `athena_resume_generate` to get the generation prompt, then produce the resume
- `/resume review` → Ask the user to paste their current resume, then call `athena_resume_review`
- `/resume` (no subcommand) → Ask whether they want to generate a new resume or review an existing one
```

**Step 4: Commit**

```bash
cd ~/Desktop/athena
git add plugin/skills/
git commit -m "feat: add slash command skills for /project, /harvest, and /resume"
```

---

## Task 10: Install Script and README

**Files:**
- Create: `install.sh`
- Create: `README.md`

**Step 1: Create install.sh**

```bash
#!/bin/bash
set -e

ATHENA_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_WORKSPACE="${HOME}/.openclaw/workspace"
OPENCLAW_EXTENSIONS="${HOME}/.openclaw/extensions"
ATHENA_DATA="${HOME}/.athena"

echo "=== Athena Installer ==="

if ! command -v openclaw &> /dev/null; then
  echo "Error: OpenClaw is not installed. Run: curl -fsSL https://get.openclaw.ai | bash"
  exit 1
fi

mkdir -p "$ATHENA_DATA"
echo "Created data directory: $ATHENA_DATA"

mkdir -p "$OPENCLAW_EXTENSIONS/athena"
cd "$ATHENA_DIR/plugin"
npm install
cp -r src/ "$OPENCLAW_EXTENSIONS/athena/src/"
cp openclaw.plugin.json "$OPENCLAW_EXTENSIONS/athena/"
cp package.json "$OPENCLAW_EXTENSIONS/athena/"
cp tsconfig.json "$OPENCLAW_EXTENSIONS/athena/"
cp -r node_modules/ "$OPENCLAW_EXTENSIONS/athena/node_modules/"
if [ -d "skills" ]; then
  cp -r skills/ "$OPENCLAW_EXTENSIONS/athena/skills/"
fi
echo "Installed plugin to: $OPENCLAW_EXTENSIONS/athena"

for file in SOUL.md AGENTS.md IDENTITY.md USER.md RESUME_KNOWLEDGE.md; do
  if [ -f "$OPENCLAW_WORKSPACE/$file" ]; then
    cp "$OPENCLAW_WORKSPACE/$file" "$OPENCLAW_WORKSPACE/${file}.backup"
    echo "Backed up existing $file"
  fi
  if [ -f "$ATHENA_DIR/workspace/$file" ]; then
    cp "$ATHENA_DIR/workspace/$file" "$OPENCLAW_WORKSPACE/$file"
  fi
done
echo "Installed workspace files"

echo ""
echo "=== Athena installed successfully ==="
echo "Data stored at: $ATHENA_DATA"
echo ""
echo "Add to your openclaw.json plugins config:"
echo '  "athena": { "enabled": true }'
echo ""
echo "Start with: openclaw"
```

**Step 2: Make executable and create README**

```bash
chmod +x ~/Desktop/athena/install.sh
```

Create `README.md` with project overview, installation instructions, slash commands, tools reference, and development guide. See design doc for structure reference.

**Step 3: Run all tests**

```bash
cd ~/Desktop/athena/plugin && npx vitest run
```

Expected: all tests pass (~40 tests across 5 suites).

**Step 4: Verify TypeScript compiles**

```bash
cd ~/Desktop/athena/plugin && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
cd ~/Desktop/athena
git add install.sh README.md
git commit -m "feat: add install script and README documentation"
```
