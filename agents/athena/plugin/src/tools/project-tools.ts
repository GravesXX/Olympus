import { ProjectManager } from '../projects/manager.js';
import type { PluginAPI } from '../types.js';
import { text } from './helpers.js';

export function registerProjectTools(api: PluginAPI, manager: ProjectManager): void {
  api.registerTool({
    name: 'athena_project_create',
    description: 'Create a new project to track. Optionally link to a local directory for code scanning.',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        project_description: { type: 'string', description: 'What this project is about' },
        directory: { type: 'string', description: 'Absolute path to the project directory (optional)' },
      },
      required: ['name', 'project_description'],
    },
    execute: async (_id, params) => {
      const name = params.name as string | undefined;
      const desc = params.project_description as string | undefined;
      if (!name) return text({ content: '', error: 'Missing required parameter: name' });
      if (!desc) return text({ content: '', error: 'Missing required parameter: project_description' });
      return text(manager.create({ name, description: desc, directory: params.directory as string | undefined }));
    },
  });

  api.registerTool({
    name: 'athena_project_list',
    description: 'List all projects grouped by phase (explore, build, harvest, completed)',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execute: async (_id, _params) => text(manager.list()),
  });

  api.registerTool({
    name: 'athena_project_open',
    description: 'Open a project by searching for it by name',
    parameters: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query to find the project by name' },
      },
      required: ['query'],
    },
    execute: async (_id, params) => text(manager.open({ query: params.query as string })),
  });

  api.registerTool({
    name: 'athena_project_advance',
    description: 'Advance a project to the next phase (explore → build → harvest → completed)',
    parameters: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID of the project to advance' },
      },
      required: ['project_id'],
    },
    execute: async (_id, params) => text(manager.advance({ project_id: params.project_id as string })),
  });

  api.registerTool({
    name: 'athena_project_scan',
    description: "Scan a project's linked directory for README, dependencies, git history, and file structure",
    parameters: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID of the project to scan' },
      },
      required: ['project_id'],
    },
    execute: async (_id, params) => text(manager.scan({ project_id: params.project_id as string })),
  });
}
