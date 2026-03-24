import fs from 'fs';
import path from 'path';
import { parse, serialize } from './frontmatter.js';
import { sanitize as sanitizeName, shortId as makeShortId } from './naming.js';
import type { NoteEntry, NoteContent } from './types.js';

export class ObsidianAdapter {
  private basePath: string;
  private index: Map<string, NoteEntry> = new Map();
  private lastIndexTime = 0;
  private readonly INDEX_TTL_MS = 5000;

  constructor(vaultPath: string, agentFolder: string) {
    this.basePath = path.join(vaultPath, agentFolder);
    this.ensureFolder('');
    this.rebuildIndex();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  createNote(folder: string, filename: string, frontmatter: Record<string, unknown>, body: string): string {
    this.ensureFolder(folder);
    const relativePath = path.join(folder, filename);
    const absPath = path.join(this.basePath, relativePath);

    if (fs.existsSync(absPath)) {
      throw new Error(`Note already exists: ${relativePath}`);
    }

    const content = serialize(frontmatter, body);
    this.atomicWrite(absPath, content);
    this.index.set(relativePath, { relativePath, frontmatter: { ...frontmatter } });
    return relativePath;
  }

  readNote(relativePath: string): NoteContent | undefined {
    const absPath = path.join(this.basePath, relativePath);
    if (!fs.existsSync(absPath)) return undefined;

    const raw = fs.readFileSync(absPath, 'utf-8');
    return parse(raw);
  }

  updateFrontmatter(relativePath: string, updates: Record<string, unknown>): void {
    const absPath = path.join(this.basePath, relativePath);
    const raw = fs.readFileSync(absPath, 'utf-8');
    const { frontmatter, body } = parse(raw);

    const merged = { ...frontmatter, ...updates };
    const content = serialize(merged, body);
    this.atomicWrite(absPath, content);

    const entry = this.index.get(relativePath);
    if (entry) {
      entry.frontmatter = { ...merged };
    }
  }

  replaceBody(relativePath: string, body: string): void {
    const absPath = path.join(this.basePath, relativePath);
    const raw = fs.readFileSync(absPath, 'utf-8');
    const { frontmatter } = parse(raw);

    const content = serialize(frontmatter, body);
    this.atomicWrite(absPath, content);
  }

  appendToBody(relativePath: string, text: string): void {
    const absPath = path.join(this.basePath, relativePath);
    const raw = fs.readFileSync(absPath, 'utf-8');
    const { frontmatter, body } = parse(raw);

    const newBody = body.trimEnd() + '\n\n' + text + '\n';
    const content = serialize(frontmatter, newBody);
    this.atomicWrite(absPath, content);
  }

  deleteNote(relativePath: string): void {
    const absPath = path.join(this.basePath, relativePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
    this.index.delete(relativePath);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  findByType(type: string): NoteEntry[] {
    this.refreshIndexIfStale();
    const results: NoteEntry[] = [];
    for (const entry of this.index.values()) {
      if (entry.frontmatter.type === type) results.push(entry);
    }
    return results;
  }

  findByField(field: string, value: unknown): NoteEntry[] {
    this.refreshIndexIfStale();
    const results: NoteEntry[] = [];
    for (const entry of this.index.values()) {
      if (entry.frontmatter[field] === value) results.push(entry);
    }
    return results;
  }

  findById(id: string): NoteEntry | undefined {
    this.refreshIndexIfStale();
    for (const entry of this.index.values()) {
      if (entry.frontmatter.id === id) return entry;
    }
    return undefined;
  }

  listFolder(folder: string): NoteEntry[] {
    this.refreshIndexIfStale();
    const prefix = folder ? folder + path.sep : '';
    const results: NoteEntry[] = [];
    for (const entry of this.index.values()) {
      if (entry.relativePath.startsWith(prefix)) results.push(entry);
    }
    return results;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  ensureFolder(folder: string): void {
    const absDir = path.join(this.basePath, folder);
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }
  }

  sanitize(name: string): string {
    return sanitizeName(name);
  }

  shortId(uuid: string): string {
    return makeShortId(uuid);
  }

  getBasePath(): string {
    return this.basePath;
  }

  // ── Index Management ──────────────────────────────────────────────────────

  rebuildIndex(): void {
    this.index.clear();
    this.scanDir('');
    this.lastIndexTime = Date.now();
  }

  private refreshIndexIfStale(): void {
    if (Date.now() - this.lastIndexTime > this.INDEX_TTL_MS) {
      this.rebuildIndex();
    }
  }

  private scanDir(relDir: string): void {
    const absDir = path.join(this.basePath, relDir);
    if (!fs.existsSync(absDir)) return;

    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relDir ? path.join(relDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        this.scanDir(relPath);
      } else if (entry.name.endsWith('.md')) {
        try {
          const raw = fs.readFileSync(path.join(absDir, entry.name), 'utf-8');
          const { frontmatter } = parse(raw);
          this.index.set(relPath, { relativePath: relPath, frontmatter });
        } catch {
          // Skip files that fail to parse
        }
      }
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private atomicWrite(absPath: string, content: string): void {
    const tmpPath = absPath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, absPath);
  }
}
