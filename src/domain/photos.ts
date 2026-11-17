import type { Day } from './dates';

/**
 * A progress photo, as in Record's photo diary: a picture and the day it belongs to. The
 * picture is a file the app keeps on the phone; `file` is its name there.
 */
export type ProgressPhoto = {
  id: string;
  date: Day;
  file: string;
  /** When it was added, in milliseconds since 1970. */
  createdAt: number;
};

/** Photos by day, newest day first, as Record's diary shows them. */
export function photoDays(photos: readonly ProgressPhoto[]): { date: Day; photos: ProgressPhoto[] }[] {
  const newest = [...photos].sort(
    (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1),
  );

  const days: { date: Day; photos: ProgressPhoto[] }[] = [];
  for (const photo of newest) {
    const day = days[days.length - 1];
    if (day && day.date === photo.date) day.photos.push(photo);
    else days.push({ date: photo.date, photos: [photo] });
  }
  return days;
}
