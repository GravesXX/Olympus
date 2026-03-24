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
