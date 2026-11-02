/**
 * Masking a floor for a player link, so it never shows the floor plainly: each square's value is
 * mixed with a byte made from the link's salt and the square's number. The players' page has to
 * unmask any square a player steps on, so it can unmask them all; a programmer could too.
 */
import { fromBase64Url, toBase64Url } from '../../../kit/packing';

async function masks(salt: string, count: number): Promise<number[]> {
  const encode = (text: string) => new TextEncoder().encode(text);
  return Promise.all(
    Array.from({ length: count }, async (_, cell) => new Uint8Array(await crypto.subtle.digest('SHA-256', encode(`${salt}:${cell}`)))[0]),
  );
}

export async function maskValues(values: readonly number[], salt: string): Promise<string> {
  const mask = await masks(salt, values.length);
  return toBase64Url(Uint8Array.from(values, (value, cell) => value ^ mask[cell]));
}

/** A floor's values from a link, or null if they aren't so many, or aren't values. */
export async function unmaskValues(text: string, salt: string, count: number): Promise<number[] | null> {
  if (!/^[\w-]*$/.test(text)) return null;
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(text);
  } catch {
    return null;
  }
  if (bytes.length !== count) return null;
  const mask = await masks(salt, count);
  const values = Array.from(bytes, (byte, cell) => byte ^ mask[cell]);
  return values.every((value) => value <= 9 + 15) ? values : null;
}
