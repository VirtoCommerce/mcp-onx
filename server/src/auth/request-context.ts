/**
 * Per-request authentication context.
 *
 * A remote MCP server serves many users through one process and one adapter
 * instance, so the caller's identity cannot live on the adapter or in a
 * module-level variable - concurrent requests would overwrite each other.
 * AsyncLocalStorage keeps it bound to the request that is being handled.
 *
 * The adapter is a separate package loaded through a dynamic import, so it
 * cannot import this storage: it would get its own module instance. Instead
 * the accessor is published on globalThis under a well-known key, and the
 * adapter reads the token through it when it is there.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestAuthContext {
  /** Raw bearer token of the calling user, forwarded to the backend as-is. */
  accessToken: string;
}

export const AUTH_CONTEXT_ACCESSOR = '__cofMcpGetAccessToken__';

const storage = new AsyncLocalStorage<RequestAuthContext>();

/** Run a request handler with the caller's token bound to it. */
export function runWithAuthContext<T>(context: RequestAuthContext, handler: () => T): T {
  return storage.run(context, handler);
}

/** Token of the request being handled, if the caller sent one. */
export function getAccessToken(): string | undefined {
  return storage.getStore()?.accessToken;
}

/**
 * Expose the accessor to adapters. Called once at startup; adapters look the
 * function up lazily, so the order of loading does not matter.
 */
export function publishAuthContextAccessor(): void {
  (globalThis as Record<string, unknown>)[AUTH_CONTEXT_ACCESSOR] = getAccessToken;
}
