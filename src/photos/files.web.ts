/*
 * The browser version exists only to look at the app during development, and its database is
 * empty again after a reload. Pictures stay as the browser handed them over, until then.
 */

const kept = new Map<string, string>();

export async function keepPhoto(source: string, name: string): Promise<void> {
  kept.set(name, source);
}

export function photoUri(name: string): string {
  return kept.get(name) ?? '';
}

export function removePhoto(name: string): void {
  kept.delete(name);
}
