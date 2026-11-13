import * as DocumentPicker from 'expo-document-picker';

import type { PickedFile } from './files';

/*
 * The browser version of files.ts, for the web preview: a file leaves as a download and comes
 * back through the browser's own file dialog.
 */

export type { PickedFile };

export async function shareTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function pickTextFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false });
  const asset = result.assets?.[0];
  if (result.canceled || !asset?.file) return null;

  return { name: asset.name, text: await asset.file.text() };
}
