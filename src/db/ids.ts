const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * A new id for an entry or an exercise: the moment it was made, then twelve random characters.
 * Ids made later sort later, and two phones making ids in the same millisecond would have to
 * pick the same twelve characters out of 36^12 to clash.
 */
export function newId(now: number = Date.now()): string {
  let random = '';
  for (let index = 0; index < 12; index += 1) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${now.toString(36).padStart(9, '0')}${random}`;
}
