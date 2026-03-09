# Quick Start

The shortest path from a running VirtoCommerce Platform to your first MCP request.

## Prerequisites

- VirtoCommerce Platform (v3+) accessible over HTTP/HTTPS
- Node.js 20+
- Claude Desktop, Cursor, VS Code with Claude Code, or any other MCP client

## Step 1. Configure VirtoCommerce

### 1.1. Verify API availability

Open in a browser or run:

```bash
curl https://your-vc-instance.com/health
```

The response should be `Healthy` (HTTP 200). If the platform is unreachable, the following steps will not work.

### 1.2. Obtain an API key

1. Open the VirtoCommerce admin panel: `https://your-vc-instance.com/`
2. Navigate to **Security → Users**
3. Select an existing user (or create a new one) with the required permissions
4. Open the **API Keys** tab
5. Click **Generate API Key** and copy the value

> If the API Keys tab is not available, the key can be generated via the VirtoCommerce REST API. See the platform documentation for details.

### 1.3. Verify permissions

The user associated with the API key must have access to at least:

| Module | Required For |
| ------ | ------------ |
| Orders | Viewing and creating orders |
| Customers / Members | Viewing customers |
| Catalog | Searching products |
| Inventory | Checking stock levels |
| Stores | Loading store configuration |

For the full list, see [PERMISSIONS.md](PERMISSIONS.md).

### 1.4. Find the Store ID (workspace)

If you have multiple stores and need to scope to a specific one:

1. Open **Stores** in the admin panel
2. Select the store
3. Copy the ID from the URL or from the **Store ID** field in settings

If you have a single store or don't need scoping, you can omit the `workspace` field.

## Step 2. Connect MCP

### Option A: Via npx (recommended)

No local installation required. Add to your MCP client configuration:

**Claude Desktop** — config file `claude_desktop_config.json`:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "virtocommerce": {
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
        "ADAPTER_CONFIG": "{\"apiUrl\":\"https://your-vc-instance.com\",\"apiKey\":\"YOUR_API_KEY\",\"workspace\":\"your-store-id\"}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Replace:
- `https://your-vc-instance.com` — your VirtoCommerce Platform URL
- `YOUR_API_KEY` — the API key from step 1.2
- `your-store-id` — the Store ID from step 1.4 (or remove the `workspace` field from the JSON)

### Option B: Local build

```bash
# Clone the repository
git clone https://github.com/VirtoCommerce/mcp-onx.git
cd mcp-onx

# Build the server
cd server
npm install
npm run build

# Build the adapter
cd ../virtocommerce-adapter
npm install
npm run build
```

MCP client configuration:

```json
{
  "mcpServers": {
    "virtocommerce": {
      "command": "node",
      "args": ["/path/to/mcp-onx/server/dist/index.js"],
      "env": {
        "ADAPTER_TYPE": "local",
        "ADAPTER_PATH": "/path/to/mcp-onx/virtocommerce-adapter/dist/index.js",
        "ADAPTER_CONFIG": "{\"apiUrl\":\"https://your-vc-instance.com\",\"apiKey\":\"YOUR_API_KEY\",\"workspace\":\"your-store-id\"}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Step 3. Verify

### 3.1. Restart the MCP client

Claude Desktop / Cursor / VS Code — restart the application so it picks up the new configuration.

### 3.2. First request

Ask Claude:

> Show me the latest orders

Or more specifically:

> Get order number ORD-001

Claude will invoke the `get-orders` tool and display data from VirtoCommerce.

### 3.3. Troubleshooting

| Symptom | Cause | Solution |
| ------- | ----- | -------- |
| `CONNECTION_FAILED` | Platform unreachable | Verify the URL and run `curl /health` |
| `UNAUTHORIZED` (401) | Invalid API key | Regenerate the key in Security → Users |
| `FORBIDDEN` (403) | Insufficient permissions | Add roles to the user (see [PERMISSIONS.md](PERMISSIONS.md)) |
| No tools visible in Claude | MCP server did not start | Check paths in the config, restart the client |
| `MODULE_NOT_FOUND` | Wrong adapter path | Verify `ADAPTER_PATH` is an absolute path to `dist/index.js` |

### 3.4. Enable debug logging

Add to `ADAPTER_CONFIG`:

```json
"debugMode": true
```

And to `env`:

```json
"LOG_LEVEL": "debug"
```

Logs are written to stderr — check the MCP server process output.

## Available Tools

Once connected, Claude will have access to:

| Tool | Description |
| ---- | ----------- |
| `get-orders` | Search and view orders |
| `create-sales-order` | Create an order |
| `update-order` | Update an order |
| `cancel-order` | Cancel an order |
| `fulfill-order` | Create a shipment |
| `get-fulfillments` | View shipments |
| `get-customers` | Search customers |
| `get-products` | Search products |
| `get-product-variants` | Product variants |
| `get-inventory` | Stock levels |
| `create-return` | Create a return |
| `get-returns` | View returns |

## Next Steps

- [CONFIGURATION.md](CONFIGURATION.md) — all adapter options in detail
- [API.md](API.md) — adapter methods mapped to VirtoCommerce API endpoints
- [PERMISSIONS.md](PERMISSIONS.md) — detailed permission requirements
