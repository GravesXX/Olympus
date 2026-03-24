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
    try { alternatives = JSON.parse(params.alternatives_json); } catch { alternatives = []; }

    const decision = this.db.addDecision(params.project_id, params.title, params.chosen, alternatives, params.reasoning);

    const lines = [
      `**Decision recorded: ${decision.title}**`,
      `- **Chosen:** ${decision.chosen}`,
      `- **Reasoning:** ${params.reasoning}`,
    ];
    if (alternatives.length > 0) {
      lines.push('- **Alternatives considered:**');
      for (const alt of alternatives) lines.push(`  - ${alt.name}: ${alt.tradeoff}`);
    }
    return { content: lines.join('\n') };
  }

  async addTodo(params: { project_id: string; title: string; priority?: string }): Promise<ToolResult> {
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

  async updateTodo(params: { todo_id: string; status: string }): Promise<ToolResult> {
    const todo = this.db.getTodo(params.todo_id);
    if (!todo) return { content: 'Todo not found.', error: 'todo_not_found' };
    this.db.updateTodoStatus(params.todo_id, params.status);
    return { content: [`**Todo updated: ${todo.title}**`, `- **Status:** ${params.status}`].join('\n') };
  }

  async listTodos(params: { project_id: string }): Promise<ToolResult> {
    const todos = this.db.getTodos(params.project_id);
    if (todos.length === 0) return { content: 'No todos for this project.' };

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
