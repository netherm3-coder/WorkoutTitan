import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/*
 * Getting a text file out of the app and back in. On a phone a file leaves through the system
 * share sheet (save to Files or Drive, send to oneself) and comes back through the system file
 * picker. The browser version of this module is in files.web.ts.
 */

export type PickedFile = { name: string; text: string };

/** Writes the text to a file of the given name and offers it to the share sheet. */
export async function shareTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  // A copy made earlier the same day has the same name.
  if (file.exists) file.delete();
  file.create();
  await file.write(text);

  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

/** Lets the person choose a file and reads it as text. `null` when they back out. */
export async function pickTextFile(): Promise<PickedFile | null> {
  // Any type: Android often labels a .json file as plain text or as unknown, and a filter by
  // type would grey the backup out.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;

  return { name: asset.name, text: await new File(asset.uri).text() };
}
