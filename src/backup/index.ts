/**
 * The backup: everything a person entered as one file, and the way back from the file.
 * `format` is the file itself and is pure; `files` is how a file leaves and enters the app.
 */

export * from './format';
export { pickTextFile, shareTextFile, type PickedFile } from './files';
export * from './recordCsv';
export * from './recordImport';
