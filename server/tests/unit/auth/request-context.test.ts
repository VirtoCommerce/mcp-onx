/**
 * Unit tests for the per-request authentication context
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  AUTH_CONTEXT_ACCESSOR,
  getAccessToken,
  publishAuthContextAccessor,
  runWithAuthContext,
} from '../../../src/auth/request-context';

describe('request auth context', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[AUTH_CONTEXT_ACCESSOR];
  });

  it('has no token outside of a request', () => {
    expect(getAccessToken()).toBeUndefined();
  });

  it('exposes the token of the request being handled', () => {
    const token = runWithAuthContext({ accessToken: 'token-1' }, () => getAccessToken());

    expect(token).toBe('token-1');
  });

  it('keeps concurrent requests apart', async () => {
    const readAfterDelay = (accessToken: string, delayMs: number) =>
      runWithAuthContext({ accessToken }, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return getAccessToken();
      });

    // The slower request finishes last, so a shared variable would hand it the
    // token of the request that started after it.
    const [slow, fast] = await Promise.all([readAfterDelay('token-slow', 20), readAfterDelay('token-fast', 1)]);

    expect(slow).toBe('token-slow');
    expect(fast).toBe('token-fast');
  });

  it('lets a separately loaded adapter read the token through globalThis', () => {
    publishAuthContextAccessor();

    const accessor = (globalThis as Record<string, unknown>)[AUTH_CONTEXT_ACCESSOR] as () => string | undefined;

    expect(runWithAuthContext({ accessToken: 'token-2' }, () => accessor())).toBe('token-2');
    expect(accessor()).toBeUndefined();
  });
});
