/**
 * The few parts of Node's file modules that tests reading project files use: the art, the
 * store listing, the icons. Declared here because the project does not load Node's own type
 * definitions: the app runs on a phone, not on Node.
 */
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readFileSync(path: string): Uint8Array;
  export function statSync(path: string): { size: number; isDirectory(): boolean };
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
}

declare const __dirname: string;
