// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, store } from './storage';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('keeps things as JSON', () => {
    store('test:board', { board: [1, 0], moves: [] });
    expect(load('test:board')).toEqual({ board: [1, 0], moves: [] });
  });

  it('gives null for what isn’t there, or isn’t JSON', () => {
    expect(load('test:nothing')).toBeNull();
    localStorage.setItem('test:broken', '{');
    expect(load('test:broken')).toBeNull();
  });

  it('carries on when the browser won’t store anything', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(() => store('test:board', [])).not.toThrow();
  });
});
