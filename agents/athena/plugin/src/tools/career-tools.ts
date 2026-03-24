import { Harvester } from '../career/harvester.js';
import { CareerCoach } from '../career/coach.js';
import { ResumeEngine } from '../career/resume.js';
import { ResumeIntake } from '../career/intake.js';
import { ResumeTailor } from '../career/tailor.js';
import { CoverLetterEngine } from '../career/cover-letter.js';
import type { PluginAPI } from '../types.js';
import { text } from './helpers.js';

export function registerCareerTools(
  api: PluginAPI,
  harvester: Harvester,
  coach: CareerCoach,
  resume: ResumeEngine,
  intake: ResumeIntake,
  tailor: ResumeTailor,
  coverLetter: CoverLetterEngine
): void {
  api.registerTool({
    name: 'athena_harvest',
    description: 'Extract skills, achievements, challenges, and reflections from a project. Call this when a project reaches the harvest phase.',
    parameters: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID of the project to harvest' },
        harvest_json: {
          type: 'string',
          description: 'JSON string with harvest results (from Claude analysis). If not provided, returns a prompt to generate harvest data.',
        },
      },
      required: ['project_id'],
    },
    execute: async (_id, params) => {
      const projectId = params.project_id as string;
      if (params.harvest_json) {
        harvester.applyHarvest(projectId, params.harvest_json as string);
        return text({ content: 'Harvest applied to achievement bank.' });
      }
      const prompt = harvester.buildHarvestPrompt(projectId);
      return text({ content: prompt });
    },
  });

  api.registerTool({
    name: 'athena_achievement_list',
    description: 'Query the achievement bank. Optionally filter by category (skill, achievement, challenge, reflection) or project.',
    parameters: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category', enum: ['skill', 'achievement', 'challenge', 'reflection'] },
        project_id: { type: 'string', description: 'Filter by project ID' },
      },
    },
    execute: async (_id, params) => text(coach.listAchievements({
      category: params.category as string | undefined,
      project_id: params.project_id as string | undefined,
    })),
  });

  api.registerTool({
    name: 'athena_experience_add',
    description: 'Add a past work experience (company, role, period, description, highlights)',
    parameters: {
      type: 'object' as const,
      properties: {
        company: { type: 'string', description: 'Company name' },
        role: { type: 'string', description: 'Job title' },
        period: { type: 'string', description: 'Time period, e.g. "2023-01 to 2024-06"' },
        experience_description: { type: 'string', description: 'What you did there' },
        highlights_json: { type: 'string', description: 'JSON array of key accomplishments' },
      },
      required: ['company', 'role', 'period', 'experience_description'],
    },
    execute: async (_id, params) => text(coach.addExperience({
      company: params.company as string,
      role: params.role as string,
      period: params.period as string,
      description: params.experience_description as string,
      highlights_json: params.highlights_json as string | undefined,
    })),
  });

  api.registerTool({
    name: 'athena_resume_generate',
    description: 'Generate a resume from your achievement bank and work experiences. Returns a prompt for Claude to produce the resume.',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execute: async (_id, _params) => {
      const prompt = resume.buildGeneratePrompt();
      return text({ content: prompt });
    },
  });

  api.registerTool({
    name: 'athena_resume_review',
    description: 'Review and polish an existing resume against best practices. Compares with your achievement bank for missed opportunities.',
    parameters: {
      type: 'object' as const,
      properties: {
        resume_text: { type: 'string', description: 'The resume text to review' },
      },
      required: ['resume_text'],
    },
    execute: async (_id, params) => {
      const prompt = resume.buildReviewPrompt(params.resume_text as string);
      return text({ content: prompt });
    },
  });

  // ── Resume Intake Tools ─────────────────────────────────────────────

  api.registerTool({
    name: 'athena_resume_ingest',
    description: 'Read resume files from a path (file or directory), store them, and return all resume contents for analysis. Supports .txt, .md, .pdf files.',
    parameters: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Absolute path to a resume file or directory containing resumes' },
        version_label: { type: 'string', description: 'Label for this resume version, e.g. "SWE March 2025" or "PM Fall 2024"' },
      },
      required: ['path'],
    },
    execute: async (_id, params) => {
      return text(intake.ingest(params.path as string, params.version_label as string | undefined));
    },
  });

  api.registerTool({
    name: 'athena_resume_intake_list',
    description: 'List all ingested resumes with metadata (filename, label, size, date)',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execute: async () => {
      return text({ content: intake.list().content });
    },
  });

  api.registerTool({
    name: 'athena_resume_intake_analyze',
    description: 'Load all ingested resume contents for cross-version analysis. Returns full text of every resume.',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execute: async () => {
      const result = intake.getAllContent();
      if (result.error) return text(result);
      return text({ content: result.content });
    },
  });

  api.registerTool({
    name: 'athena_resume_intake_clear',
    description: 'Clear all ingested resumes from the bank (fresh start)',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execute: async () => {
      return text(intake.clear());
    },
  });

  // ── Resume Tailor Tools ───────────────────────────────────────────────

  api.registerTool({
    name: 'athena_jd_fetch',
    description: 'Fetch a job description from a URL, extract text, and store it. Returns the JD text for analysis.',
    parameters: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL of the job posting' },
      },
      required: ['url'],
    },
    execute: async (_id, params) => {
      const result = await tailor.fetchJobDescription(params.url as string);
      return text(result);
    },
  });

  api.registerTool({
    name: 'athena_jd_save_analysis',
    description: 'Save a structured analysis of a job description (extracted requirements, skills, seniority level, etc.)',
    parameters: {
      type: 'object' as const,
      properties: {
        jd_id: { type: 'string', description: 'ID of the job description' },
        analysis: { type: 'string', description: 'Structured analysis of the JD (skills, requirements, seniority, keywords)' },
      },
      required: ['jd_id', 'analysis'],
    },
    execute: async (_id, params) => {
      return text(tailor.saveAnalysis(params.jd_id as string, params.analysis as string));
    },
  });

  api.registerTool({
    name: 'athena_resume_tailor',
    description: 'Generate a tailored resume for a specific job description. Combines JD requirements with achievement bank and work experience.',
    parameters: {
      type: 'object' as const,
      properties: {
        jd_id: { type: 'string', description: 'ID of the job description to tailor for' },
      },
      required: ['jd_id'],
    },
    execute: async (_id, params) => {
      const prompt = tailor.buildTailorPrompt(params.jd_id as string);
      return text({ content: prompt });
    },
  });

  api.registerTool({
    name: 'athena_resume_ats_check',
    description: 'Check a tailored resume against the job description for ATS keyword match. Returns match rate and missing keywords.',
    parameters: {
      type: 'object' as const,
      properties: {
        jd_id: { type: 'string', description: 'ID of the job description' },
        resume_text: { type: 'string', description: 'The tailored resume text to check' },
      },
      required: ['jd_id', 'resume_text'],
    },
    execute: async (_id, params) => {
      const prompt = tailor.buildAtsCheckPrompt(params.jd_id as string, params.resume_text as string);
      return text({ content: prompt });
    },
  });

  api.registerTool({
    name: 'athena_jd_list',
    description: 'List all fetched job descriptions with analysis status',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execute: async () => {
      return text(tailor.listJobDescriptions());
    },
  });

  // ── Soft Skills Tools ─────────────────────────────────────────────

  api.registerTool({
    name: 'athena_soft_skill_add',
    description: 'Add a soft skill to the knowledge base with evidence and source',
    parameters: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Soft skill title, e.g. "Cross-functional collaboration"' },
        skill_description: { type: 'string', description: 'Evidence-backed description of the skill' },
        evidence_json: { type: 'string', description: 'JSON array of specific examples/evidence' },
        source: { type: 'string', description: 'Where this skill was identified', enum: ['cover_letter', 'interview', 'reflection', 'manual'] },
        tags_json: { type: 'string', description: 'JSON array of category tags, e.g. ["leadership", "communication"]' },
      },
      required: ['title', 'skill_description'],
    },
    execute: async (_id, params) => text(coverLetter.addSoftSkill({
      title: params.title as string,
      description: params.skill_description as string,
      evidence_json: params.evidence_json as string | undefined,
      source: params.source as string | undefined,
      tags_json: params.tags_json as string | undefined,
    })),
  });

  api.registerTool({
    name: 'athena_soft_skill_list',
    description: 'List all soft skills in the knowledge base, optionally filtered by source',
    parameters: {
      type: 'object' as const,
      properties: {
        source: { type: 'string', description: 'Filter by source', enum: ['cover_letter', 'interview', 'reflection', 'manual'] },
      },
    },
    execute: async (_id, params) => text(coverLetter.listSoftSkills(params.source as string | undefined)),
  });

  api.registerTool({
    name: 'athena_soft_skill_harvest',
    description: 'Extract soft skills from a text (cover letter, reflection, interview notes). Returns a prompt for Claude to identify soft skills.',
    parameters: {
      type: 'object' as const,
      properties: {
        source_text: { type: 'string', description: 'The text to extract soft skills from' },
        source_type: { type: 'string', description: 'Type of source text', enum: ['cover_letter', 'interview', 'reflection'] },
      },
      required: ['source_text', 'source_type'],
    },
    execute: async (_id, params) => {
      const prompt = coverLetter.buildHarvestPrompt(params.source_text as string, params.source_type as string);
      return text({ content: prompt });
    },
  });

  // ── Cover Letter Tools ────────────────────────────────────────────

  api.registerTool({
    name: 'athena_cover_letter_generate',
    description: 'Generate a tailored cover letter for a specific job description. Combines JD + achievement bank + soft skills + work experience.',
    parameters: {
      type: 'object' as const,
      properties: {
        jd_id: { type: 'string', description: 'ID of the job description to generate for' },
      },
      required: ['jd_id'],
    },
    execute: async (_id, params) => {
      const prompt = coverLetter.buildGeneratePrompt(params.jd_id as string);
      return text({ content: prompt });
    },
  });

  api.registerTool({
    name: 'athena_cover_letter_ingest',
    description: 'Ingest an existing cover letter file, store it, and extract soft skills for the knowledge base',
    parameters: {
      type: 'object' as const,
      properties: {
        file_path: { type: 'string', description: 'Absolute path to the cover letter file' },
        version_label: { type: 'string', description: 'Label for this cover letter version' },
        company: { type: 'string', description: 'Company the cover letter was for' },
        role: { type: 'string', description: 'Role the cover letter was for' },
      },
      required: ['file_path'],
    },
    execute: async (_id, params) => text(coverLetter.ingest(
      params.file_path as string,
      params.company as string | undefined,
      params.role as string | undefined,
      params.version_label as string | undefined
    )),
  });

  api.registerTool({
    name: 'athena_cover_letter_list',
    description: 'List all stored cover letters, optionally filtered by company',
    parameters: {
      type: 'object' as const,
      properties: {
        company: { type: 'string', description: 'Filter by company name' },
      },
    },
    execute: async (_id, params) => text(coverLetter.listCoverLetters(params.company as string | undefined)),
  });
}
