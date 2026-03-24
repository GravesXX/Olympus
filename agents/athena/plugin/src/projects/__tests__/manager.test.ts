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
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-test-'));
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test Project\nA test.');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', dependencies: { express: '4.0' } }));

    const project = db.createProject('Test', 'desc', tmpDir);
    const result = await manager.scan({ project_id: project.id });
    expect(result.content).toContain('README.md');
    expect(result.content).toContain('express');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should return error when scanning project with no directory', async () => {
    const project = db.createProject('Test', 'desc');
    const result = await manager.scan({ project_id: project.id });
    expect(result.error).toBe('no_directory');
  });
});
