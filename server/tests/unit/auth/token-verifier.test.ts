/**
 * Unit tests for TokenVerifier
 *
 * The issuer is stubbed out: a locally generated key pair stands in for the
 * commerce platform, so the accepted and the rejected paths can both be
 * exercised without a live environment.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, type JWK } from 'jose';
import { InvalidTokenError, TokenVerifier } from '../../../src/auth/token-verifier';

const ISSUER = 'https://platform.example';

let privateKey: CryptoKey;
let publicJwk: JWK;

async function sign(claims: { subject: string; expiresIn?: string; issuer?: string }): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(claims.subject)
    .setIssuer(claims.issuer ?? ISSUER)
    .setIssuedAt()
    .setExpirationTime(claims.expiresIn ?? '5m')
    .sign(privateKey);
}

function stubIssuer(userinfoStatus = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.endsWith('/.well-known/openid-configuration')) {
        return new Response(
          JSON.stringify({
            jwks_uri: `${ISSUER}/.well-known/jwks`,
            userinfo_endpoint: `${ISSUER}/connect/userinfo`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.endsWith('/.well-known/jwks')) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.endsWith('/connect/userinfo')) {
        return new Response(userinfoStatus === 200 ? JSON.stringify({ sub: 'opaque-user' }) : '', {
          status: userinfoStatus,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`unexpected request to ${url}`);
    })
  );
}

describe('TokenVerifier', () => {
  beforeAll(async () => {
    const pair = await generateKeyPair('RS256', { extractable: true });
    privateKey = pair.privateKey;
    publicJwk = { ...(await exportJWK(pair.publicKey)), alg: 'RS256', use: 'sig' };
  });

  beforeEach(() => stubIssuer());
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a token signed by the issuer and reports its subject', async () => {
    const token = await sign({ subject: 'user-42' });

    await expect(new TokenVerifier(ISSUER).verify(token)).resolves.toBe('user-42');
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('user-42')
      .setIssuer(ISSUER)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(privateKey);

    await expect(new TokenVerifier(ISSUER).verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects a token from another issuer', async () => {
    const token = await sign({ subject: 'user-42', issuer: 'https://attacker.example' });

    await expect(new TokenVerifier(ISSUER).verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects a token signed by an unknown key', async () => {
    const other = await generateKeyPair('RS256', { extractable: true });
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('user-42')
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(other.privateKey);

    await expect(new TokenVerifier(ISSUER).verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('falls back to the issuer for a token that is not a signed JWT', async () => {
    await expect(new TokenVerifier(ISSUER).verify('opaque-token')).resolves.toBeUndefined();
  });

  it('rejects an opaque token the issuer does not recognise', async () => {
    stubIssuer(401);

    await expect(new TokenVerifier(ISSUER).verify('opaque-token')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('asks the issuer once per token while the cache is warm', async () => {
    const verifier = new TokenVerifier(ISSUER);

    await verifier.verify('opaque-token');
    await verifier.verify('opaque-token');

    const userinfoCalls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.filter(([url]) =>
      String(url).endsWith('/connect/userinfo')
    );

    expect(userinfoCalls).toHaveLength(1);
  });
});
