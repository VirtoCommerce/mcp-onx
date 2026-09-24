/**
 * Unit tests for the protected resource settings
 */
import { describe, it, expect } from 'vitest';
import { readAuthSettings, requireAuthSettings } from '../../../src/auth/protected-resource';

describe('auth settings', () => {
  it('names the issuer and trims the trailing slash', () => {
    const settings = readAuthSettings({ AUTH_ISSUER: 'https://platform.example/' } as NodeJS.ProcessEnv);

    expect(settings?.issuer).toBe('https://platform.example');
  });

  it('is absent when no issuer is configured', () => {
    expect(readAuthSettings({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('refuses to serve a network transport without an issuer', () => {
    // Forgetting the variable must not quietly produce a server that lets everyone in.
    expect(() => requireAuthSettings({} as NodeJS.ProcessEnv)).toThrowError(/AUTH_ISSUER is required/);
  });

  it('serves anonymous callers only when that is stated explicitly', () => {
    expect(requireAuthSettings({ ALLOW_ANONYMOUS: 'true' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('keeps requiring an issuer for any other value of the escape hatch', () => {
    expect(() => requireAuthSettings({ ALLOW_ANONYMOUS: '1' } as NodeJS.ProcessEnv)).toThrowError();
    expect(() => requireAuthSettings({ ALLOW_ANONYMOUS: 'yes' } as NodeJS.ProcessEnv)).toThrowError();
  });
});
