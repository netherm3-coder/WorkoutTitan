/*
 * Ids travel between screens inside the address of a screen: `/entry/<id>`, `/goal?discipline=<key>`.
 * Most ids are plain letters and digits, but not all of them: an entry brought over from
 * Record's file is named after its row (`csv:2026-03-01|Планка|3:00#1`), an exercise of the
 * person's own after its name, and a backup file can hold anything.
 *
 * expo-router decodes a parameter twice, so an id with a `%2F` in it arrives as `/` and the
 * screen finds nothing. Rather than lean on how the router treats the special characters of an
 * address, an id is passed as the hex digits of its UTF-8 bytes: no encoding or decoding can
 * change those, however many times it runs.
 */

const HEX_PAIR = /^[0-9a-f]{2}$/;

/** The bytes of the text in UTF-8, by way of the one encoder every JavaScript engine has. */
function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  const encoded = encodeURIComponent(text);
  for (let index = 0; index < encoded.length; ) {
    if (encoded[index] === '%') {
      bytes.push(parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 3;
    } else {
      bytes.push(encoded.charCodeAt(index));
      index += 1;
    }
  }
  return bytes;
}

/** An id as it goes into the address of a screen. */
export function toRouteParam(id: string): string {
  return utf8Bytes(id)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The id a screen was opened with. `null` when the address holds something that was not made by
 * `toRouteParam`: the screen then says it has nothing to show, as for an id that no longer exists.
 */
export function fromRouteParam(param: string | string[] | undefined): string | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value || value.length % 2 !== 0) return null;

  let escaped = '';
  for (let index = 0; index < value.length; index += 2) {
    const pair = value.slice(index, index + 2).toLowerCase();
    if (!HEX_PAIR.test(pair)) return null;
    escaped += `%${pair}`;
  }

  try {
    return decodeURIComponent(escaped);
  } catch {
    // Bytes that are not UTF-8.
    return null;
  }
}
