# Configuration Guide

How to configure the `@virtocommerce/mcp-onx` adapter for VirtoCommerce Platform.

## Table of Contents

- [Configuration Guide](#configuration-guide)
  - [Table of Contents](#table-of-contents)
  - [Adapter Options](#adapter-options)
    - [TypeScript Interface](#typescript-interface)
  - [Environment Variables](#environment-variables)
    - [All MCP Server Environment Variables](#all-mcp-server-environment-variables)
  - [What `workspace` Does](#what-workspace-does)
  - [What `catalogId` Does](#what-catalogid-does)
  - [Connection Sequence](#connection-sequence)
  - [API Client Behavior](#api-client-behavior)
    - [Authentication](#authentication)
    - [Timeout](#timeout)
    - [Retry Logic](#retry-logic)
    - [Retryable Errors](#retryable-errors)
    - [Debug Mode](#debug-mode)
  - [Claude Desktop Integration](#claude-desktop-integration)
    - [Via npx](#via-npx)
    - [Via local file paths](#via-local-file-paths)
    - [Testing via JSON-RPC (stdio)](#testing-via-json-rpc-stdio)
    - [Security Notes](#security-notes)

---

## Adapter Options

Options are passed via the `ADAPTER_CONFIG` JSON string or directly to the adapter constructor.

| Field           | Type      | Required | Default | Description                                                             |
| --------------- | --------- | -------- | ------- | ----------------------------------------------------------------------- |
| `apiUrl`        | `string`  | Yes      | —       | VirtoCommerce Platform base URL (e.g., `https://vc.example.com`)        |
| `apiKey`        | `string`  | Yes      | —       | API key for authentication (sent as `api_key` header)                   |
| `workspace`     | `string`  | No       | —       | Store ID — scopes orders/shipments to a store, auto-detects `catalogId` |
| `catalogId`     | `string`  | No       | —       | Catalog ID — restricts product searches to a specific catalog           |
| `timeout`       | `number`  | No       | `30000` | Request timeout in milliseconds                                         |
| `retryAttempts` | `number`  | No       | `3`     | Maximum retry attempts for transient errors                             |
| `debugMode`     | `boolean` | No       | `false` | Enable verbose request/response logging to stderr                       |

### TypeScript Interface

```typescript
interface AdapterOptions {
  apiUrl: string;
  apiKey: string;
  workspace?: string;
  catalogId?: string;
  timeout?: number;       // default: 30000
  retryAttempts?: number;  // default: 3
  debugMode?: boolean;     // default: false
}
```

---

## Environment Variables

Set these in the MCP server `.env`, `.env.local`, or process environment:

```bash
# Adapter loading
ADAPTER_TYPE=local
ADAPTER_PATH=/absolute/path/to/virtocommerce-adapter/dist/index.js

# Or for npm-installed adapter:
# ADAPTER_TYPE=npm
# ADAPTER_PACKAGE=@virtocommerce/mcp-onx

# Adapter configuration (JSON string)
ADAPTER_CONFIG={"apiUrl":"https://vc.example.com","apiKey":"YOUR_API_KEY","workspace":"your-store-id","timeout":30000,"retryAttempts":3,"debugMode":false}
```

The `ADAPTER_CONFIG` JSON is parsed and passed to the adapter constructor as `config.options`.

### All MCP Server Environment Variables

| Variable          | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `ADAPTER_TYPE`    | `local` (file path) or `npm` (package name)                            |
| `ADAPTER_PATH`    | Absolute path to adapter's `dist/index.js` (when `ADAPTER_TYPE=local`) |
| `ADAPTER_PACKAGE` | NPM package name (when `ADAPTER_TYPE=npm`)                             |
| `ADAPTER_EXPORT`  | Export name — defaults to `default`                                    |
| `ADAPTER_CONFIG`  | JSON string with adapter options                                       |
| `LOG_LEVEL`       | Logging level: `debug`, `info`, `warn`, `error`                        |

---

## What `workspace` Does

The `workspace` option maps to a VirtoCommerce **Store ID** and affects multiple operations:

1. **On `connect()`**: Fetches store configuration via `GET /api/stores/{workspace}`
   - Extracts `catalog` from the store response
   - Auto-sets `catalogId` if not explicitly provided
   - Logs store name for confirmation

2. **Order search**: Passes `storeId` in `CustomerOrderSearchCriteria`

3. **Shipment search**: Filters results by `storeIds`

4. **Product search**: Uses the store's catalog for scoping

5. **Pricing evaluation**: Passes `storeId` in `PriceEvaluationContext`

6. **Order creation**: Sets `storeId` and `storeName` on new orders

If `workspace` is not set, orders and shipments are not scoped to any particular store.

---

## What `catalogId` Does

The `catalogId` option restricts product searches to a specific VirtoCommerce catalog:

- Passed as `catalogIds` filter in `ProductSearchCriteria`
- Set on line items during order creation (`catalogId` field on `LineItem`)
- **Auto-detection**: If `workspace` is configured and the store has a `catalog` property, `catalogId` is automatically set from the store config

Priority: explicit `catalogId` option > auto-detected from store > not set.

---

## Connection Sequence

When `connect()` is called, the adapter performs three steps:

```
1. GET /health
   └── Verify VirtoCommerce API is reachable
   └── Throws CONNECTION_FAILED if unsuccessful

2. GET /api/stores/{workspace}    (only when workspace is set)
   └── Load store configuration
   └── Extract catalogId from store.catalog
   └── Propagate catalogId to OrderService, ProductService
   └── Non-fatal: logs warning on failure

3. GET /api/platform/common/countries
   └── Build bidirectional country lookup maps (code ↔ name)
   └── Propagate to OrderService, CustomerService, FulfillmentService
   └── Non-fatal: logs warning on failure
```

Steps 2 and 3 are **non-fatal** — the adapter continues even if store or country fetching fails, but address resolution and catalog scoping may be degraded.

---

## API Client Behavior

### Authentication

The adapter sends the API key as an `api_key` HTTP header on every request:

```
api_key: YOUR_API_KEY
```

### Timeout

Default: **30 seconds** (30000ms). Configurable via `timeout` option.

> **Note**: In production, the MCP server's `ConfigManager.applySecurityPolicies()` caps request timeouts at **60 seconds** regardless of the configured value.

### Retry Logic

Exponential backoff with jitter:

| Attempt   | Delay      |
| --------- | ---------- |
| 1st retry | 1 second   |
| 2nd retry | 2 seconds  |
| 3rd retry | 4 seconds  |
| Max delay | 10 seconds |

Formula: `min(1000 * 2^(attempt-1), 10000)` ms

When the server responds with a `Retry-After` header (common on 429 responses), the adapter uses that value instead of the exponential backoff delay. The `Retry-After` delay is capped at **60 seconds**.

### Retryable Errors

| HTTP Status   | Meaning           | Retried? |
| ------------- | ----------------- | -------- |
| — (no status) | Network error     | Yes      |
| 5xx           | Server errors     | Yes      |
| 408           | Request Timeout   | Yes      |
| 429           | Too Many Requests | Yes      |
| 423           | Locked            | Yes      |
| 400           | Bad Request       | No       |
| 401           | Unauthorized      | No       |
| 403           | Forbidden         | No       |
| 404           | Not Found         | No       |
| 422           | Validation Error  | No       |

### Debug Mode

When `debugMode: true`, the API client logs full request and response details to stderr (excluding `/health` calls to reduce noise).

---

## Claude Desktop Integration

Add to your Claude Desktop config file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Via npx

No local installation required — `npx` downloads and runs the packages on demand:

```json
{
  "mcpServers": {
    "cof-mcp": {
      "command": "npx",
      "args": [
        "--package=@virtocommerce/cof-mcp@alpha",
        "--package=@virtocommerce/mcp-onx@alpha",
        "--yes",
        "cof-mcp"
      ],
      "env": {
        "ADAPTER_TYPE": "npm",
        "ADAPTER_PACKAGE": "@virtocommerce/mcp-onx",
        "ADAPTER_CONFIG": "{\"apiUrl\":\"https://vc.example.com\",\"apiKey\":\"YOUR_API_KEY\",\"workspace\":\"your-store-id\"}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

The `--yes` flag skips the install confirmation prompt. The `cof-mcp` binary is provided by the `@virtocommerce/cof-mcp` server package.

### Via local file paths

Use when working with local builds or development clones:

```json
{
  "mcpServers": {
    "cof-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/server/dist/index.js"],
      "env": {
        "ADAPTER_TYPE": "local",
        "ADAPTER_PATH": "/absolute/path/to/virtocommerce-adapter/dist/index.js",
        "ADAPTER_CONFIG": "{\"apiUrl\":\"https://vc.example.com\",\"apiKey\":\"YOUR_API_KEY\",\"workspace\":\"your-store-id\"}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Testing via JSON-RPC (stdio)

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"get-orders","arguments":{"ids":["order-id"],"includeLineItems":true}}}' | npx -y @virtocommerce/cof-mcp
```

### Security Notes

- Do not commit `ADAPTER_CONFIG` with real API keys to version control
- Use environment variables or a secrets manager for credentials
- Consider separate API keys for development and production
