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
        { category: 'skill', title: 'React', description: 'Built a dashboard with React and TypeScript', tags: ['React', 'TypeScript'] },
        { category: 'achievement', title: 'Shipped MVP', description: 'Delivered MVP in 2 weeks, serving 50 users', tags: ['delivery'] },
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
      company: 'Acme Corp', role: 'Software Engineer', period: '2023-01 to 2024-06',
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
