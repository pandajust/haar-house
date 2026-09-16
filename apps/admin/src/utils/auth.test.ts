import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth';

describe('auth utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('setTokens / getAccessToken roundtrip', () => {
    setTokens('access-1', 'refresh-1');
    expect(getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
  });

  it('getAccessToken returns null when not set', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('setTokens without refresh does not set refresh key', () => {
    setTokens('access-only');
    expect(getAccessToken()).toBe('access-only');
    expect(getRefreshToken()).toBeNull();
  });

  it('clearTokens removes both keys', () => {
    setTokens('a', 'b');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
