/**
 * OAuth protected resource metadata (RFC 9728).
 *
 * How a client discovers where to log in: it calls the MCP endpoint, gets 401
 * with a WWW-Authenticate header pointing at the metadata document, reads the
 * authorization server from there and runs the authorization code flow against
 * the commerce platform.
 */

import * as http from 'http';

export interface AuthSettings {
  /** Authorization server, i.e. the commerce platform that issues the tokens. */
  issuer: string;
  /** Public base URL of this server, when it cannot be taken from the request. */
  publicUrl?: string;
}

export const METADATA_PATH = '/.well-known/oauth-protected-resource';

/**
 * Authentication is off unless an issuer is configured: a deployment without
 * one keeps working with the service credentials of the adapter.
 */
export function readAuthSettings(env: NodeJS.ProcessEnv = process.env): AuthSettings | null {
  const issuer = env.AUTH_ISSUER?.trim();

  if (!issuer) {
    return null;
  }

  return {
    issuer: issuer.replace(/\/+$/, ''),
    publicUrl: env.MCP_PUBLIC_URL?.trim().replace(/\/+$/, ''),
  };
}

/** Public base URL of this server, as the client sees it behind the ingress. */
export function baseUrl(req: http.IncomingMessage, settings: AuthSettings): string {
  if (settings.publicUrl) {
    return settings.publicUrl;
  }

  const forwardedProto = firstValue(req.headers['x-forwarded-proto']);
  const forwardedHost = firstValue(req.headers['x-forwarded-host']);
  const host = forwardedHost || req.headers.host || 'localhost';

  return `${forwardedProto || 'http'}://${host}`;
}

export function metadataUrl(req: http.IncomingMessage, settings: AuthSettings): string {
  return `${baseUrl(req, settings)}${METADATA_PATH}`;
}

export function buildMetadata(req: http.IncomingMessage, settings: AuthSettings): object {
  return {
    resource: `${baseUrl(req, settings)}/mcp`,
    authorization_servers: [`${settings.issuer}/`],
    bearer_methods_supported: ['header'],
  };
}

/**
 * The challenge that sends the client to the metadata document. `error` is
 * omitted for a missing token and set to invalid_token for a rejected one, as
 * RFC 6750 prescribes.
 */
export function challenge(req: http.IncomingMessage, settings: AuthSettings, reason?: string): string {
  const parts = [`Bearer resource_metadata="${metadataUrl(req, settings)}"`];

  if (reason) {
    parts.push('error="invalid_token"', `error_description="${reason.replace(/"/g, "'")}"`);
  }

  return parts.join(', ');
}

function firstValue(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;

  return value?.split(',')[0]?.trim() || undefined;
}
