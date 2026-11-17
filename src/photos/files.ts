import { Directory, File, Paths } from 'expo-file-system';

/**
 * Where the pictures of progress photos live: among the app's own documents, out of the gallery.
 * Android's cloud backup of the app leaves this folder out (plugins/withBackupRules.js).
 */
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

/**
 * Whether the picture is on the phone. It is not when Android has brought the database back
 * from its cloud backup on a new phone: the photos are left out of that backup.
 */
export function hasPhoto(name: string): boolean {
  return new File(folder(), name).exists;
}

/** Removes a kept picture. A picture that is already gone is fine. */
export function removePhoto(name: string): void {
  const file = new File(folder(), name);
  if (file.exists) file.delete();
}
