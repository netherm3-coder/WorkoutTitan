import { Directory, File, Paths } from 'expo-file-system';

/** Where the pictures of progress photos live: among the app's own documents, out of the gallery. */
const folder = () => new Directory(Paths.document, 'progress-photos');

/**
 * Copies a chosen picture to the app's own files under the given name. The copy stays when the
 * person deletes the original from the gallery; deleting the photo in the app removes the copy.
 */
export async function keepPhoto(source: string, name: string): Promise<void> {
  const target = folder();
  target.create({ intermediates: true, idempotent: true });
  await new File(source).copy(new File(target, name));
}

/** The address an image component shows a kept picture from. */
export function photoUri(name: string): string {
  return new File(folder(), name).uri;
}

/** Removes a kept picture. A picture that is already gone is fine. */
export function removePhoto(name: string): void {
  const file = new File(folder(), name);
  if (file.exists) file.delete();
}
