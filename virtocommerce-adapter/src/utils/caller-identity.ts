/**
 * Access to the identity of the caller whose request is being handled.
 *
 * The MCP server keeps that identity in an AsyncLocalStorage of its own and
 * publishes a reader for it on globalThis. The adapter is loaded as a separate
 * package, so it cannot share the storage itself, and it must not depend on
 * the server package either - hence the lookup by a well-known key.
 *
 * No accessor means nobody is forwarding an identity (stdio, tests, a server
 * without this support), and the client falls back to its configured API key.
 */

const AUTH_CONTEXT_ACCESSOR = '__cofMcpGetAccessToken__';

export function getCallerAccessToken(): string | undefined {
  const accessor = (globalThis as Record<string, unknown>)[AUTH_CONTEXT_ACCESSOR];

  if (typeof accessor !== 'function') {
    return undefined;
  }

  return (accessor as () => string | undefined)();
}
