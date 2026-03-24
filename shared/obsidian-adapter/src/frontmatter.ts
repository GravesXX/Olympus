import matter from 'gray-matter';

export function parse(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const result = matter(raw);
  return {
    frontmatter: result.data as Record<string, unknown>,
    body: result.content,
  };
}

export function serialize(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(body, frontmatter);
}
