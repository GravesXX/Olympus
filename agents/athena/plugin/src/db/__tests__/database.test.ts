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

  it('should follow phase order: explore -> build -> harvest -> completed', () => {
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
    db.advancePhase(project.id);
    expect(db.getProject(project.id)?.phase).toBe('completed');
  });

  it('should list projects by phase', () => {
    db.createProject('A', 'desc');
    const b = db.createProject('B', 'desc');
    db.advancePhase(b.id);
    expect(db.getProjectsByPhase('explore')).toHaveLength(1);
    expect(db.getProjectsByPhase('build')).toHaveLength(1);
  });

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
