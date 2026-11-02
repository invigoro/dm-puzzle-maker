import { describe, expect, it } from 'vitest';
import { pack, unpack } from './packing';

describe('pack', () => {
  it('comes back as it went', async () => {
    const data = { v: 1, text: 'Ünïcode, “quotes” and emoji 🎲', list: [1, 2, null], nested: { ok: true } };
    expect(await unpack(await pack(data))).toEqual(data);
  });

  it('is safe in a URL', async () => {
    expect(await pack({ text: '?&#/+= '.repeat(20) })).toMatch(/^[\w-]+$/);
  });

  it('gives null for anything it didn’t pack', async () => {
    expect(await unpack('')).toBeNull();
    expect(await unpack('not-packed-at-all')).toBeNull();
    expect(await unpack('***')).toBeNull();
  });
});
