import path from 'path';
import os from 'os';
import { AthenaDB } from '../db/database.js';
import { ProjectManager } from '../projects/manager.js';
import { BuildTools } from './build-tools.js';
import { Harvester } from '../career/harvester.js';
import { CareerCoach } from '../career/coach.js';
import { ResumeEngine } from '../career/resume.js';
import { ResumeIntake } from '../career/intake.js';
import { ResumeTailor } from '../career/tailor.js';
import { CoverLetterEngine } from '../career/cover-letter.js';
import { registerProjectTools } from './project-tools.js';
import { registerCareerTools } from './career-tools.js';
import { text } from './helpers.js';
import type { PluginAPI } from '../types.js';

export function registerAllTools(api: PluginAPI): void {
  const vaultPath = path.join(os.homedir(), 'Documents', 'Obsidian Vault');
  const db = new AthenaDB(vaultPath);

  const manager = new ProjectManager(db);
  const buildTools = new BuildTools(db);
  const harvester = new Harvester(db);
  const coach = new CareerCoach(db);
  const resume = new ResumeEngine(db);
  const intake = new ResumeIntake(db);
  const tailor = new ResumeTailor(db);
  const coverLetter = new CoverLetterEngine(db);

  // ── Project Tools (5) ───────────────────────────────────────────────
  registerProjectTools(api, manager);

  // ── Build Tools (4) ─────────────────────────────────────────────────

  api.registerTool({
    name: 'athena_decision_record',
    description: 'Record a key decision with the chosen approach, alternatives considered, and reasoning',
    parameters: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID of the project' },
        title: { type: 'string', description: 'What was decided' },
        chosen: { type: 'string', description: 'The chosen approach' },
        alternatives_json: { type: 'string', description: 'JSON array of {name, tradeoff} objects for alternatives' },
        reasoning: { type: 'string', description: 'Why this choice was made' },
      },
      required: ['project_id', 'title', 'chosen', 'reasoning'],
    },
    execute: async (_id, params) => text(buildTools.recordDecision({
      project_id: params.project_id as string,
      title: params.title as string,
      chosen: params.chosen as string,
      alternatives_json: (params.alternatives_json as string) || '[]',
      reasoning: params.reasoning as string,
    })),
  });

  api.registerTool({
    name: 'athena_todo_add',
    description: 'Add a todo item to a project',
    parameters: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID of the project' },
        title: { type: 'string', description: 'Task description' },
        priority: { type: 'string', description: 'Priority: 1 (high), 2 (medium), 3 (low). Default: 2' },
      },
      required: ['project_id', 'title'],
    },
    execute: async (_id, params) => text(buildTools.addTodo({
      project_id: params.project_id as string,
      title: params.title as string,
      priority: params.priority as string | undefined,
    })),
  });

  api.registerTool({
    name: 'athena_todo_update',
    description: 'Update the status of a todo item',
    parameters: {
      type: 'object' as const,
      properties: {
        todo_id: { type: 'string', description: 'ID of the todo' },
        status: { type: 'string', description: 'New status', enum: ['pending', 'in_progress', 'done'] },
      },
      required: ['todo_id', 'status'],
    },
    execute: async (_id, params) => text(buildTools.updateTodo({
      todo_id: params.todo_id as string,
      status: params.status as string,
    })),
  });

  api.registerTool({
    name: 'athena_todo_list',
    description: 'List all todos for a project with progress summary',
    parameters: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID of the project' },
      },
      required: ['project_id'],
    },
    execute: async (_id, params) => text(buildTools.listTodos({ project_id: params.project_id as string })),
  });

  // ── Career Tools (20) ───────────────────────────────────────────────
  registerCareerTools(api, harvester, coach, resume, intake, tailor, coverLetter);
}
