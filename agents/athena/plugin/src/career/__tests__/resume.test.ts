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
