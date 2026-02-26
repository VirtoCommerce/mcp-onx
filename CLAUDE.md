# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Commerce Operations Foundation (COF) MCP Reference Server — a monorepo implementing the Order Network eXchange (onX) standard for AI-powered fulfillment operations via the Model Context Protocol.

```
/server                  - Core MCP server (@virtocommerce/cof-mcp) — Vitest
/virtocommerce-adapter   - VirtoCommerce fulfillment adapter (@virtocommerce/mcp-onx) — Jest
/adapter-template        - Boilerplate for creating new adapters
/schemas                 - JSON Schema definitions for domain models
/docs                    - Specification and architectural documentation
```

## Development Commands

### Server (`/server`)

```bash
cd server
npm install
npm run build              # tsc → dist/
npm run dev                # Hot reload via vite-node
npm test                   # Build + run all tests (vitest)
npm run test:unit          # Unit tests only
npm run test:integration
npx vitest tests/unit/adapters/adapter-factory.test.ts  # Single test file
npx vitest tests/unit --grep "AdapterFactory"           # Tests matching pattern
npm run lint               # ESLint (flat config)
npm run format             # Prettier
npm run typecheck          # tsc --noEmit
npm run generate:json-schemas  # Regenerate /schemas from TypeScript types
```

### VirtoCommerce Adapter (`/virtocommerce-adapter`)

```bash
cd virtocommerce-adapter
npm install
npm run build              # tsc → dist/
npm run dev                # tsc --watch
npm test                   # Jest with --experimental-vm-modules
npm run test:integration   # Build + test-integration.js
```

**Build order matters**: The adapter depends on the server via `"@virtocommerce/cof-mcp": "file:../server"` — always build the server first.

### CI (GitHub Actions)

Node 20. Runs typecheck → lint → test (unit + integration matrix) on the server. Codecov for unit coverage. Trivy security scan on push.

## Architecture

### Three-Layer Design

1. **Protocol Layer** (`server/src/server.ts`, `server/src/index.ts`)
   - `MCPServerSDK` wraps `@modelcontextprotocol/sdk` Server with `StdioServerTransport`
   - All `console.*` redirected to `stderr` to keep stdout clean for MCP JSON-RPC
   - Loads `.env` then `.env.local` (overrides) via dotenv
   - Startup: `ConfigManager.getInstance()` → `Logger.init()` → `RetryHandler/Sanitizer/TimeoutHandler.setConfig()` → `server.start()`

2. **Service Layer** (`server/src/services/`)
   - `ServiceOrchestrator` — main facade; every operation wraps adapter calls with timeout, error handling, and metrics
   - `AdapterManager`, `HealthMonitor`, `ErrorHandler`, `Transformer`, `Validator` (AJV-based JSON Schema)

3. **Adapter Layer** (`server/src/adapters/`)
   - `IFulfillmentAdapter` interface — 13 required methods validated at creation time by `AdapterFactory.validateAdapter()`
   - `AdapterFactory` — creates, validates, and caches adapter instances (singleton per config key)
   - Dynamic loading via `import()` for npm/local adapters

### Tool System

Tools in `server/src/tools/` extend `BaseTool<TInput, TOutput>` and are **manually registered** in `registerTools()` (`tools/index.ts`) — not auto-discovered:
- **Actions**: `create-sales-order`, `update-order`, `cancel-order`, `fulfill-order`, `create-return`
- **Queries**: `get-orders`, `get-customers`, `get-products`, `get-product-variants`, `get-inventory`, `get-fulfillments`, `get-returns`

Tools are thin wrappers — all business logic lives in `ServiceOrchestrator`. New tools must be added to `registerTools()`.

### Adapter Loading

Configured via environment variables (see `server/.env.example`):
- `ADAPTER_TYPE=built-in` + `ADAPTER_NAME=mock` — built-in MockAdapter
- `ADAPTER_TYPE=npm` + `ADAPTER_PACKAGE=@company/adapter` — dynamic import from node_modules
- `ADAPTER_TYPE=local` + `ADAPTER_PATH=/path/to/adapter.js` — dynamic import from file path
- `ADAPTER_CONFIG={"apiUrl":"...","apiKey":"..."}` — JSON config passed to adapter
- `ADAPTER_EXPORT=ClassName` — optional, defaults to `default` export
- Feature flags: `FEATURE_*` env vars converted to boolean

### Error Handling (Two-Tier)

1. **Protocol errors** — thrown as `McpError` (invalid request, unknown tool) → MCP SDK handles, client sees JSON-RPC error
2. **Tool execution errors** — returned as `{ content: [...], isError: true }` (adapter failures, business logic) → client can inspect and retry

`ErrorAdapter.processError()` in `server/src/errors/error-adapter.ts` decides the tier. Error classes in `server/src/utils/errors.ts` carry `isProtocolError` and `retryable` properties.

### Logging

Winston-based structured logging (`server/src/logging/structured-logger.ts`) + simple `Logger` (`server/src/utils/logger.ts`):
- All output to stderr (preserves stdout for MCP JSON-RPC)
- File rotation: `error.log` (10MB/5 files), `combined.log` (10MB/10 files)
- Built-in correlation IDs, PII sanitization, structured methods

## VirtoCommerce Adapter

### Architecture

```
adapter.ts (VirtoCommerceFulfillmentAdapter)
├── services/           — domain services (order, customer, fulfillment, product, return)
├── transformers/       — VirtoCommerce ↔ MCP bidirectional mapping
├── mappers/            — MCP filters → VC search criteria
├── models/             — TypeScript defs matching VC API
└── utils/api-client.ts — axios with retry, timeout, auth
```

### Key Patterns

- **Status mapping**: VirtoCommerce uses PascalCase (`New`, `Processing`, `Shipped`), MCP uses lowercase (`pending`, `processing`, `shipped`). See `STATUS_MAP` / `REVERSE_STATUS_MAP` in `types.ts`.
- **Order updates**: Three-step (GET current → apply changes → PUT full order), not PATCH.
- **Customer enrichment**: Orders fetched separately from customers, then merged via `customerMap`.
- **API authentication**: `api_key` header (configurable), with exponential backoff retry (default 3 attempts, 30s timeout).

## Code Style

- **Prettier**: `printWidth: 120`, `singleQuote: true`, `trailingComma: 'es5'`, `semi: true` (see `prettier.config.cjs`)
- **ESLint**: Flat config (`server/eslint.config.js`). `no-console` allows only `warn`/`error`. Unused vars prefixed with `_` (`argsIgnorePattern: '^_'`). `no-var: error`.
- **Naming**: Classes PascalCase, functions camelCase, constants UPPER_SNAKE_CASE, files kebab-case

## Key Implementation Details

### ES Module Requirements
- All imports use `.js` extension (e.g., `from './file.js'`)
- `type: "module"` in both packages
- Use `import`/`export`, not `require`

### Test Isolation

**Server (Vitest)**: `singleThread: true` to prevent `AdapterFactory` cache race conditions. Always call `AdapterFactory.clearInstances()` in test cleanup. Setup file: `tests/setup.ts`. Path alias: `@` → `./src`.

**VirtoCommerce Adapter (Jest)**: Uses `ts-jest/presets/default-esm` with `extensionsToTreatAsEsm: ['.ts']`. Coverage threshold: 80% (branches, functions, lines, statements). Custom `moduleNameMapper` strips `.js` extensions. Requires `--experimental-vm-modules`.

### IFulfillmentAdapter Required Methods

Lifecycle: `connect()`, `disconnect()`, `healthCheck()`
Actions: `createSalesOrder`, `cancelOrder`, `updateOrder`, `fulfillOrder`
Queries: `getOrders`, `getCustomers`, `getProducts`, `getProductVariants`, `getInventory`, `getFulfillments`

Optional (registered as tools but not in `validateAdapter`): `createReturn`, `getReturns`

### MCP Response Format
```typescript
// Success
{ content: [{ type: "text", text: string }], isError: false }
// Error
{ content: [{ type: "text", text: string }], isError: true }
```

### ServiceOrchestrator Lifecycle
```typescript
await serviceOrchestrator.initialize(adapterConfig);  // Required before use
await serviceOrchestrator.cleanup();                   // Disconnect + stop monitors
```

## Client Integration (Claude Desktop — stdio)

```json
{
  "mcpServers": {
    "cof-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/server/dist/index.js"],
      "env": {
        "ADAPTER_TYPE": "local",
        "ADAPTER_PATH": "/absolute/path/to/virtocommerce-adapter/dist/index.js",
        "ADAPTER_CONFIG": "{\"apiUrl\":\"https://vc.example.com\",\"apiKey\":\"key\",\"workspace\":\"default\"}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Config location: `%APPDATA%\Claude\claude_desktop_config.json` (Windows), `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

### Testing via JSON-RPC (stdio)

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-orders","arguments":{"ids":["order-id"],"includeLineItems":true}}}' | node server/dist/index.js
```

## Detailed Server Documentation

See `/server/CLAUDE.md` for server-specific guidance including configuration system details (`ConfigManager`, multi-source loading), error handling pipeline, health monitoring, and common development patterns.
