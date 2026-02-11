# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the Commerce Operations Foundation (COF) MCP Reference Server - a monorepo implementing the Order Network eXchange (onX) standard for AI-powered fulfillment operations via the Model Context Protocol. Active development branch: `virto` (VirtoCommerce adapter integration).

## Repository Structure

```
/server                  - Core MCP server (main package: @cof-org/mcp)
/virtocommerce-adapter   - VirtoCommerce fulfillment adapter (@virtocommerce/vc-fulfillment-mcp-adapter)
/adapter-template        - Boilerplate for creating new adapters
/schemas                 - JSON Schema definitions for domain models
/docs                    - Specification and architectural documentation
/prompts                 - Developer notes/context for the integration work
```

## Development Commands

### Server (`/server`) — Vitest

```bash
cd server
npm install
npm run build              # Compile TypeScript to dist/
npm run dev                # Hot reload via vite-node
npm test                   # Build + run all tests
npm run test:unit          # Unit tests only
npm run test:integration
npx vitest tests/unit/adapters/adapter-factory.test.ts  # Single test file
npx vitest tests/unit --grep "AdapterFactory"           # Tests matching pattern
npm run lint               # ESLint
npm run format             # Prettier
npm run generate:json-schemas  # Regenerate /schemas from TypeScript types
```

### VirtoCommerce Adapter (`/virtocommerce-adapter`) — Jest

```bash
cd virtocommerce-adapter
npm install
npm run build              # Compile TypeScript
npm run dev                # Watch mode (tsc --watch)
npm test                   # Jest with experimental VM modules
npm run test:integration   # Build + test-integration.js
```

**Important**: The VirtoCommerce adapter uses **Jest** (not Vitest like the server). It depends on the server via `file:../server` — build the server first.

## Architecture

### Three-Layer Design

1. **Protocol Layer** (`server/src/server.ts`, `server/src/index.ts`)
   - Dual transport: **stdio** (default, for Claude Desktop) and **SSE** (HTTP, for cloud/remote)
   - All `console.*` redirected to `stderr` to keep stdout clean for MCP JSON-RPC
   - Loads `.env` then `.env.local` (overrides) via dotenv
   - Transport selected via `MCP_TRANSPORT` env var (`stdio` | `sse`)

2. **Service Layer** (`server/src/services/`)
   - `ServiceOrchestrator` — main facade; every operation wraps adapter calls with timeout, error handling, and metrics
   - `AdapterManager`, `HealthMonitor`, `ErrorHandler`, `Transformer`, `Validator`

3. **Adapter Layer** (`server/src/adapters/`)
   - `IFulfillmentAdapter` interface (14 methods: 4 lifecycle + 5 actions + 5 queries + optional)
   - `AdapterFactory` — creates, validates, and caches adapter instances
   - Dynamic loading via `import()` for npm/local adapters

### Tool System

Tools in `server/src/tools/` extend `BaseTool<TInput, TOutput>` and are **manually registered** in `registerTools()` (not auto-discovered):
- **Actions** (`tools/actions/`): `create-sales-order`, `update-order`, `cancel-order`, `fulfill-order`, `create-return`
- **Queries** (`tools/queries/`): `get-orders`, `get-customers`, `get-products`, `get-product-variants`, `get-inventory`, `get-fulfillments`, `get-returns`

Tools are thin wrappers — all business logic lives in `ServiceOrchestrator`.

### Adapter Loading

Configured via environment variables:
- `ADAPTER_TYPE=built-in` + `ADAPTER_NAME=mock` — built-in MockAdapter
- `ADAPTER_TYPE=npm` + `ADAPTER_PACKAGE=@company/adapter` — dynamic import from node_modules
- `ADAPTER_TYPE=local` + `ADAPTER_PATH=/path/to/adapter.js` — dynamic import from file path
- `ADAPTER_CONFIG={"apiUrl":"...","apiKey":"..."}` — JSON config passed to adapter
- `ADAPTER_EXPORT=ClassName` — optional, defaults to `default` export

### Logging

Winston-based structured logging (`server/src/logging/structured-logger.ts`):
- Console transport to stderr (all levels, colorized)
- File rotation: `error.log` (10MB/5 files), `combined.log` (10MB/10 files)
- Daily rotation in production with gzip, 14-day retention
- Built-in correlation IDs, PII sanitization, and structured methods (`logRequest`, `logResponse`, `logToolExecution`, `logAdapterCall`)

## VirtoCommerce Adapter

### Architecture

Domain-driven design with service delegation:

```
adapter.ts (VirtoCommerceFulfillmentAdapter)
├── services/
│   ├── order.service.ts        — order CRUD + search
│   ├── customer.service.ts     — customer queries
│   ├── fulfillment.service.ts  — shipment tracking
│   ├── product.service.ts      — products, variants, inventory
│   └── return.service.ts       — returns handling
├── transformers/               — VirtoCommerce ↔ MCP bidirectional mapping
├── mappers/filter.mappers.ts   — MCP filters → VC search criteria
├── models/                     — TypeScript defs matching VC API
└── utils/api-client.ts         — axios with retry, timeout, auth
```

### Key Patterns

- **Status mapping**: VirtoCommerce uses PascalCase (`New`, `Processing`, `Shipped`), MCP uses lowercase (`pending`, `processing`, `shipped`). See `STATUS_MAP` / `REVERSE_STATUS_MAP` in `types.ts`.
- **Order updates**: Three-step (GET current → apply changes → PUT full order), not PATCH.
- **Customer enrichment**: Orders fetched separately from customers, then merged via `customerMap`.
- **API authentication**: `api_key` header (configurable), with exponential backoff retry (default 3 attempts, 30s timeout).

### Testing via JSON-RPC (stdio)

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-orders","arguments":{"ids":["order-id"],"includeLineItems":true}}}' | node server\dist\index.js
```

## SSE Transport & HTTP Deployment

### SSE Endpoints

When running with `MCP_TRANSPORT=sse`:
- `GET /sse` — Establishes SSE connection (returns `sessionId`)
- `POST /messages?sessionId=<id>` — Sends JSON-RPC messages to a session
- `GET /health` — Health check (`{"status":"ok","transport":"sse","sessions":N}`)
- CORS enabled for all origins

### Running via Docker

```bash
# Local testing
docker compose up --build

# Or directly
docker build -t cof-mcp .
docker run -p 3000:3000 --env-file .env.docker -e MCP_TRANSPORT=sse -e MCP_PORT=3000 cof-mcp
```

The Dockerfile is a multi-stage build (builder → prod-deps → runtime) on `node:22-alpine`. Runs as non-root user `cof`. HEALTHCHECK hits `/health` every 30s.

`docker-compose.yml` uses `.env.docker` for adapter config and adds `host.docker.internal` for accessing local VirtoCommerce API from inside the container.

### Cloud Deployment

For cloud, override these environment variables:
- `ADAPTER_CONFIG` — set real VirtoCommerce API URL and key (not `host.docker.internal`)
- `NODE_TLS_REJECT_UNAUTHORIZED` — remove or set to `1` in production
- `LOG_LEVEL` — use `info` or `warn` (debug is force-disabled in production anyway)

### Error Handling (Two-Tier)

1. **Protocol errors** — thrown as `McpError` (invalid request, unknown tool) → MCP SDK handles, client sees JSON-RPC error
2. **Tool execution errors** — returned as `{ content: [...], isError: true }` (adapter failures, business logic errors) → client can inspect and retry

`ErrorAdapter.processError()` in `server/src/errors/error-adapter.ts` decides which tier an error belongs to.

## Key Implementation Details

### ES Module Requirements
- All imports use `.js` extension (e.g., `from './file.js'`)
- `type: "module"` in both packages
- Use `import`/`export`, not `require`

### Test Isolation (Server)
- Vitest with `singleThread: true` to prevent AdapterFactory cache race conditions
- Always call `AdapterFactory.clearInstances()` in test cleanup
- Setup file: `tests/setup.ts`
- Path alias: `@` → `./src`

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

### IFulfillmentAdapter Required Methods
Lifecycle: `connect()`, `disconnect()`, `healthCheck()`, optional `initialize(config)`
Actions: `createSalesOrder`, `cancelOrder`, `updateOrder`, `fulfillOrder`, `createReturn`
Queries: `getOrders`, `getCustomers`, `getProducts`, `getProductVariants`, `getInventory`, `getFulfillments`, `getReturns`

`AdapterFactory.validateAdapter()` checks all required methods at creation time.

## Client Integration

### Claude Desktop (stdio)

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

### Remote SSE (Docker / Cloud)

```json
{
  "mcpServers": {
    "cof-mcp": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

For cloud deployments, replace `localhost:3000` with the actual host URL.

## Detailed Server Documentation

See `/server/CLAUDE.md` for comprehensive server-specific guidance including:
- Configuration system details (ConfigManager, multi-source loading, environment priority)
- Error handling patterns (McpError vs tool errors, ErrorHandler pipeline)
- Health monitoring
- Security considerations (dynamic adapter loading, production hardening)
- Common development patterns (adding tools, adding service operations)
