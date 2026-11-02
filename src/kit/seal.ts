/**
 * Sealing a line, such as the one for solving a puzzle, so a player link holds it without showing
 * it: encrypted (AES-GCM) with a key made slowly from the answer, so only the answer opens it.
 */
import { ROUNDS } from './check';
import { fromBase64Url, toBase64Url } from './packing';

export interface Sealed {
  iv: string;
  data: string;
}

const encode = (text: string) => new TextEncoder().encode(text);

async function keyFor(answer: string, salt: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encode(answer), 'PBKDF2', false, ['deriveKey']);
  // Its own salt, so the key is nothing like the answer's fingerprint.
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encode(`seal:${salt}`), iterations: ROUNDS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** A line sealed with an answer. */
export async function seal(line: string, answer: string, salt: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(answer, salt), encode(line));
  return { iv: toBase64Url(iv), data: toBase64Url(new Uint8Array(data)) };
}

/** A sealed line, opened with the answer, or null if it isn't the answer. */
export async function unseal(sealed: Sealed, answer: string, salt: string): Promise<string | null> {
  try {
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(sealed.iv) }, await keyFor(answer, salt), fromBase64Url(sealed.data));
    return new TextDecoder().decode(data);
  } catch {
    return null;
  }
}

/** A sealed line from untrusted data, or null. */
export function readSealed(data: unknown): Sealed | null {
  const input = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const { iv, data: sealed } = input;
  const ok = (text: unknown, longest: number): text is string => typeof text === 'string' && text.length <= longest && /^[\w-]*$/.test(text);
  return ok(iv, 32) && ok(sealed, 2000) ? { iv, data: sealed } : null;
}
