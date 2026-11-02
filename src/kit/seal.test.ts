import { describe, expect, it } from 'vitest';
import { quickFingerprint } from './check';
import { readSealed, seal, unseal } from './seal';

describe('seal', () => {
  it('opens with the answer, and with nothing else', async () => {
    const sealed = await seal('The door grinds open.', 'IRONWOOD', 'pepper');
    expect(JSON.stringify(sealed)).not.toContain('door');
    expect(await unseal(sealed, 'IRONWOOD', 'pepper')).toBe('The door grinds open.');
    expect(await unseal(sealed, 'IRONWOODS', 'pepper')).toBeNull();
    expect(await unseal(sealed, 'IRONWOOD', 'salt')).toBeNull();
  });

  it('reads back only what could be sealed', async () => {
    const sealed = await seal('Open.', 'KEY', 'pepper');
    expect(readSealed(JSON.parse(JSON.stringify(sealed)))).toEqual(sealed);
    for (const junk of [null, 'sealed', { iv: 7, data: 'x' }, { iv: 'a b', data: 'x' }]) expect(readSealed(junk)).toBeNull();
  });
});

describe('quickFingerprint', () => {
  it('is the same for the same text and salt, and different otherwise', async () => {
    expect(await quickFingerprint('0:K', 'pepper')).toBe(await quickFingerprint('0:K', 'pepper'));
    expect(await quickFingerprint('0:K', 'pepper')).not.toBe(await quickFingerprint('1:K', 'pepper'));
    expect(await quickFingerprint('0:K', 'pepper')).not.toBe(await quickFingerprint('0:K', 'salt'));
    expect(await quickFingerprint('0:K', 'pepper')).toMatch(/^[\w-]{16}$/);
  });
});
