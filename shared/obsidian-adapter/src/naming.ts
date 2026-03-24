const UNSAFE_CHARS = /[\\/:*?"<>|#^[\]]/g;

export function sanitize(name: string): string {
  if (!name) return 'untitled';
  return name.replace(UNSAFE_CHARS, '-').replace(/\s+/g, ' ').trim() || 'untitled';
}

export function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8);
}
