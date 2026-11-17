/** The kept pictures, in memory: name → the address it was copied from. Tests read it and clear it. */
export const kept = new Map<string, string>();

export const keepPhoto = jest.fn(async (source: string, name: string) => {
  kept.set(name, source);
});

export const photoUri = jest.fn((name: string) => `file:///documents/progress-photos/${name}`);

export const hasPhoto = jest.fn((name: string) => kept.has(name));

export const removePhoto = jest.fn((name: string) => {
  kept.delete(name);
});
