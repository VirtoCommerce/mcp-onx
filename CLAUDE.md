# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the Commerce Operations Foundation (COF) MCP Reference Server - a monorepo implementing the Order Network eXchange (onX) standard for AI-powered fulfillment operations via the Model Context Protocol.

## Repository Structure

```
/server           - Core MCP server implementation (main development target)
/adapter-template - Boilerplate for creating custom fulfillment adapters
/schemas          - JSON Schema definitions for domain models
/docs             - Specification and architectural documentation
```

## Development Commands

All primary development happens in `/server`. Run commands from that directory:

```bash
cd server
npm install
npm run build          # Compile TypeScript
npm run dev            # Development with hot reload
npm test               # Build + run all tests
npm run test:unit      # Unit tests only
npm run test:integration
npx vitest tests/unit/file.test.ts  # Run single test file
npm run lint           # ESLint
npm run format         # Prettier
```

For adapter development in `/adapter-template`:
```bash
cd adapter-template
npm install
npm run build
npm test
npm run dev            # Watch mode compilation
```

## Architecture

### Three-Layer Design

1. **Protocol Layer** (`server/src/server.ts`, `server/src/index.ts`)
   - MCP SDK integration with stdio transport
   - Request routing (tools/list, tools/call)

2. **Service Layer** (`server/src/services/`)
   - `ServiceOrchestrator` - main facade for all operations
   - `AdapterManager`, `HealthMonitor`, `ErrorHandler`, `Transformer`, `Validator`

3. **Adapter Layer** (`server/src/adapters/`)
   - `IFulfillmentAdapter` interface that all adapters implement
   - Pluggable: supports built-in, NPM packages, and local file adapters
   - `AdapterFactory` handles creation and caching

### Tool System

Tools in `server/src/tools/` extend `BaseTool<TInput, TOutput>`:
- **Actions**: `create-sales-order`, `update-order`, `cancel-order`, `fulfill-order`, `create-return`
- **Queries**: `get-orders`, `get-customers`, `get-products`, `get-product-variants`, `get-inventory`, `get-fulfillments`, `get-returns`

New tools: create in `src/tools/[category]/`, extend `BaseTool`, add to `registerTools` function.

### Adapter Loading

Configured via environment variables:
- `ADAPTER_TYPE=built-in` + `ADAPTER_NAME=mock` - Use built-in adapter
- `ADAPTER_TYPE=npm` + `ADAPTER_PACKAGE=@company/adapter` - Load from NPM
- `ADAPTER_TYPE=local` + `ADAPTER_PATH=/path/to/adapter.js` - Load local file

### JSON Schemas

Domain model schemas in `/schemas/`:
- `order.json`, `customer.json`, `product.json`, `product-variant.json`
- `inventory.json`, `fulfillment.json`, `return.json`
- `tool-inputs/` - Input schemas for each tool

Generate schemas: `npm run generate:json-schemas` (in server/)

## Key Implementation Details

### ES Module Requirements
- All imports use `.js` extension (e.g., `from './file.js'`)
- `type: "module"` in package.json
- Use `import`/`export`, not `require`

### Test Isolation
- Vitest with `singleThread: true` to prevent race conditions
- Always call `AdapterFactory.clearInstances()` in test cleanup

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
```

## Creating a Custom Adapter

1. Copy `/adapter-template` to your project
2. Implement `IFulfillmentAdapter` interface (all 12 operations)
3. For built-in: add to `AdapterFactory.builtInAdapters` map
4. For external: publish as NPM package or load via local path

The interface requires: `initialize()`, `shutdown()`, plus operations like `createSalesOrder`, `getOrders`, `getCustomers`, etc.

## Claude Desktop Integration

```json
{
  "mcpServers": {
    "cof-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/server/dist/index.js"],
      "env": {
        "ADAPTER_TYPE": "built-in",
        "ADAPTER_NAME": "mock"
      }
    }
  }
}
```

Config location: `%APPDATA%\Claude\claude_desktop_config.json` (Windows), `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

## Detailed Server Documentation

See `/server/CLAUDE.md` for comprehensive server-specific guidance including:
- Configuration system details
- Error handling patterns
- Health monitoring
- Security considerations
- Common development patterns
