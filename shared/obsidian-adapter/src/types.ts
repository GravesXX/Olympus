export interface NoteEntry {
  relativePath: string;
  frontmatter: Record<string, unknown>;
}

export interface NoteContent {
  frontmatter: Record<string, unknown>;
  body: string;
}
