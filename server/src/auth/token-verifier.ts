/**
 * Verification of the caller's access token against the commerce platform.
 *
 * The platform stays the authority on what the caller may do: this check only
 * establishes that the token is genuine and current, so that an anonymous or
 * expired caller is turned away with 401 instead of reaching the backend.
 * Permissions are enforced by the platform on the API call itself.
 *
 * Signed tokens are verified locally against the published JWKS, which costs
 * no round trip. A token that is not a signed JWT - the platform can be
 * configured to issue encrypted or opaque ones - is checked by asking the
 * userinfo endpoint, with a short-lived cache so a burst of tool calls does
 * not turn into a burst of introspection requests.
 */

import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { Logger } from '../utils/logger.js';

export class InvalidTokenError extends Error {}

interface ProviderMetadata {
  jwks_uri: string;
  userinfo_endpoint?: string;
}

const INTROSPECTION_CACHE_MS = 60_000;

export class TokenVerifier {
  private metadata: Promise<ProviderMetadata> | null = null;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private introspected = new Map<string, number>();

  constructor(private readonly issuer: string) {}

  /** Subject of the caller, or InvalidTokenError if the token is not usable. */
  async verify(token: string): Promise<string | undefined> {
    if (isSignedJwt(token)) {
      return this.verifySignature(token);
    }

    await this.introspect(token);

    return undefined;
  }

  private async verifySignature(token: string): Promise<string | undefined> {
    const { jwks_uri: jwksUri } = await this.providerMetadata();

    this.jwks ??= createRemoteJWKSet(new URL(jwksUri));

    let payload: JWTPayload;

    try {
      ({ payload } = await jwtVerify(token, this.jwks, { issuer: [this.issuer, `${this.issuer}/`] }));
    } catch (error) {
      throw new InvalidTokenError(error instanceof Error ? error.message : 'token verification failed');
    }

    return payload.sub;
  }

  private async introspect(token: string): Promise<void> {
    const key = createHash('sha256').update(token).digest('hex');
    const cachedUntil = this.introspected.get(key);

    if (cachedUntil && cachedUntil > Date.now()) {
      return;
    }

    const { userinfo_endpoint: userinfoEndpoint } = await this.providerMetadata();

    if (!userinfoEndpoint) {
      throw new InvalidTokenError('token is not a signed JWT and the issuer has no userinfo endpoint');
    }

    const response = await fetch(userinfoEndpoint, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      this.introspected.delete(key);
      throw new InvalidTokenError(`issuer rejected the token with ${response.status}`);
    }

    this.introspected.set(key, Date.now() + INTROSPECTION_CACHE_MS);
  }

  private providerMetadata(): Promise<ProviderMetadata> {
    this.metadata ??= fetch(`${this.issuer}/.well-known/openid-configuration`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`issuer metadata request failed with ${response.status}`);
        }

        return (await response.json()) as ProviderMetadata;
      })
      .catch((error) => {
        // Do not cache a failed discovery: the issuer may just be restarting.
        this.metadata = null;
        Logger.error('Failed to read issuer metadata', { issuer: this.issuer, error });
        throw error;
      });

    return this.metadata;
  }
}

function isSignedJwt(token: string): boolean {
  return token.split('.').length === 3;
}
