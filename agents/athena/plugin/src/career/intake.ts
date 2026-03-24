import fs from 'fs';
import path from 'path';
import { AthenaDB } from '../db/database.js';
import type { ToolResult } from '../types.js';

export class ResumeIntake {
  constructor(private db: AthenaDB) {}

  async ingest(filePath: string, versionLabel?: string): Promise<ToolResult> {
    const stat = fs.statSync(filePath);
    const files: string[] = [];

    if (stat.isDirectory()) {
      const entries = fs.readdirSync(filePath);
      for (const entry of entries) {
        const ext = path.extname(entry).toLowerCase();
        if (['.txt', '.md', '.pdf'].includes(ext)) {
          files.push(path.join(filePath, entry));
        }
      }
      if (files.length === 0) {
        return { content: '', error: `No resume files (.txt, .md, .pdf) found in ${filePath}` };
      }
    } else {
      files.push(filePath);
    }

    const results: string[] = [];
    for (const file of files) {
      const filename = path.basename(file);
      const ext = path.extname(file).toLowerCase();
      let content: string;

      if (ext === '.pdf') {
        content = await this.readPdf(file);
      } else {
        content = fs.readFileSync(file, 'utf-8');
      }

      if (!content.trim()) continue;

      const label = versionLabel || filename;
      this.db.addResume(filename, content, label);
      results.push(`**${filename}** (${content.length} chars)`);
    }

    const allResumes = this.db.getAllResumes();
    const sections: string[] = [
      `Ingested ${results.length} resume(s):`,
      ...results.map(r => `- ${r}`),
      '',
      `Total resumes in bank: ${allResumes.length}`,
      '',
      '---',
      '',
    ];

    for (const resume of allResumes) {
      sections.push(`## ${resume.version_label || resume.filename} (${resume.ingested_at})`);
      sections.push('');
      sections.push(resume.content);
      sections.push('');
      sections.push('---');
      sections.push('');
    }

    sections.push('All resumes are loaded above. Analyze them now.');

    return { content: sections.join('\n') };
  }

  list(): ToolResult {
    const resumes = this.db.getAllResumes();
    if (resumes.length === 0) {
      return { content: 'No resumes ingested yet. Use `/intake` with a file or folder path.' };
    }

    const lines: string[] = [`**${resumes.length} resume(s) in bank:**`, ''];
    for (const r of resumes) {
      lines.push(`- **${r.version_label || r.filename}** — ${r.filename} (${r.content.length} chars, ingested ${r.ingested_at})`);
    }
    return { content: lines.join('\n') };
  }

  getAllContent(): ToolResult {
    const resumes = this.db.getAllResumes();
    if (resumes.length === 0) {
      return { content: '', error: 'No resumes ingested. Ingest resumes first.' };
    }

    const sections: string[] = [];
    for (const resume of resumes) {
      sections.push(`## ${resume.version_label || resume.filename}`);
      sections.push(`Ingested: ${resume.ingested_at}`);
      sections.push('');
      sections.push(resume.content);
      sections.push('');
      sections.push('---');
      sections.push('');
    }

    return { content: sections.join('\n') };
  }

  clear(): ToolResult {
    const count = this.db.getResumeCount();
    this.db.clearResumes();
    return { content: `Cleared ${count} resume(s) from the bank.` };
  }

  private async readPdf(filePath: string): Promise<string> {
    try {
      const { PDFParse } = await import('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = new Uint8Array(buffer);
      const pdf = new PDFParse({ data });
      const result = await pdf.getText();
      return result.text;
    } catch {
      return `[Error reading PDF: ${filePath}. Make sure pdf-parse is installed.]`;
    }
  }
}
