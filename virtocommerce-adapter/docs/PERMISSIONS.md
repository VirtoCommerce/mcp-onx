# VirtoCommerce Permissions Guide

Required API permissions for the `@virtocommerce/mcp-onx` adapter.

## Table of Contents

- [Required API Permissions](#required-api-permissions)
- [Minimal Permission Sets](#minimal-permission-sets)
- [Security Recommendations](#security-recommendations)
- [VirtoCommerce Permission Reference](#virtocommerce-permission-reference)

---

## Required API Permissions

The adapter uses the following VirtoCommerce modules and HTTP methods. Permissions must cover all endpoints used by the operations you need.

| VC Module | Endpoints Used | HTTP Methods | Operations |
| --------- | -------------- | ------------ | ---------- |
| **Order** | `/api/order/customerOrders`, `/api/order/customerOrders/search`, `/api/order/customerOrders/{id}` | GET, POST, PUT | `createSalesOrder`, `cancelOrder`, `updateOrder`, `getOrders`, `fulfillOrder`, `createReturn` |
| **Shipment** | `/api/order/shipments/search` | POST | `getFulfillments` |
| **Customer/Members** | `/api/members/{id}`, `/api/members/search` | GET, POST | `getCustomers`, `createSalesOrder` (enrichment), `getOrders` (enrichment) |
| **Catalog** | `/api/catalog/search/products` | POST | `getProducts`, `getProductVariants`, `getInventory`, SKU resolution |
| **Pricing** | `/api/pricing/evaluate` | POST | `createSalesOrder` (optional price lookup) |
| **Inventory** | `/api/inventory/search` | POST | `getInventory` |
| **Store** | `/api/stores/{storeId}` | GET | `connect` (when workspace set) |
| **Platform** | `/api/platform/common/countries` | GET | `connect` (address resolution) |
| **Return** | `/api/return/`, `/api/return/{id}`, `/api/return/search` | GET, PUT, POST | `createReturn`, `getReturns` |

### Detailed Permission Breakdown

#### Read Operations

| Permission Area | Used By | Access Level |
| --------------- | ------- | ------------ |
| Order: Read / Search | `getOrders()`, `cancelOrder()`, `updateOrder()`, `fulfillOrder()`, `createReturn()` | Read |
| Shipment: Search | `getFulfillments()` | Read |
| Customer/Members: Read / Search | `getCustomers()`, `createSalesOrder()`, `getOrders()` | Read |
| Catalog: Search Products | `getProducts()`, `getProductVariants()`, `getInventory()`, `createSalesOrder()` | Read |
| Pricing: Evaluate | `createSalesOrder()` | Read |
| Inventory: Search | `getInventory()` | Read |
| Store: Read | `connect()` | Read |
| Platform: Read Countries | `connect()` | Read |
| Return: Read / Search | `getReturns()`, `createReturn()` | Read |

#### Write Operations

| Permission Area | Used By | Access Level |
| --------------- | ------- | ------------ |
| Order: Create | `createSalesOrder()` | Write |
| Order: Update | `cancelOrder()`, `updateOrder()`, `fulfillOrder()` | Write |
| Return: Create / Update | `createReturn()` | Write |

---

## Minimal Permission Sets

### Read-Only Profile

For query operations only (`getOrders`, `getCustomers`, `getProducts`, `getProductVariants`, `getInventory`, `getFulfillments`, `getReturns`):

| Module | Permission |
| ------ | ---------- |
| Order | Read, Search |
| Shipment | Search |
| Customer/Members | Read, Search |
| Catalog | Search |
| Inventory | Search |
| Store | Read |
| Platform | Read |
| Return | Read, Search |

This profile supports all `get*` methods plus `connect()` and `healthCheck()`.

### Full Profile (Read + Write)

For all operations including order creation, updates, cancellations, fulfillment, and returns:

| Module | Permission |
| ------ | ---------- |
| Order | Read, Search, Create, Update |
| Shipment | Search |
| Customer/Members | Read, Search |
| Catalog | Search |
| Pricing | Evaluate (optional — only for automatic price lookup) |
| Inventory | Search |
| Store | Read |
| Platform | Read |
| Return | Read, Search, Create, Update |

---

## Security Recommendations

### Dedicated API Key

Create a dedicated API key for the MCP integration rather than reusing an admin or user key. This allows:

- Scoped permissions specific to adapter needs
- Independent key rotation without affecting other integrations
- Clear audit trail for MCP-originated API calls

### Least-Privilege Principle

- Start with the **Read-Only Profile** if you only need query operations
- Add write permissions only for the operations you actually use
- Pricing evaluation permission is only needed if you want automatic price lookup during order creation

### Separate Keys for Environments

- Use different API keys for development, staging, and production
- Development keys can have broader permissions for testing
- Production keys should follow least-privilege strictly

### Dedicated Role in VirtoCommerce

Create an "MCP Integration" role in VirtoCommerce:

1. Go to **Security → Roles** in the VirtoCommerce admin
2. Create a new role (e.g., `MCP Integration`)
3. Assign only the permissions listed above
4. Create an API account with this role
5. Use that account's API key in `ADAPTER_CONFIG`

### Key Rotation

- Rotate API keys periodically
- Update `ADAPTER_CONFIG` or environment variables when rotating
- The adapter picks up new keys on restart (or via `updateConfig()` at runtime)

---

## VirtoCommerce Permission Reference

Exact permission names depend on your VirtoCommerce version and installed modules. Common permission identifiers:

| Adapter Need | Typical VC Permission ID |
| ------------ | ------------------------ |
| Order read/search | `order:read` |
| Order create | `order:create` |
| Order update | `order:update` |
| Customer read/search | `customer:read` |
| Catalog search | `catalog:read` |
| Pricing evaluate | `pricing:read` |
| Inventory search | `inventory:read` |
| Store read | `store:read` |
| Return read/search | `return:read` |
| Return create/update | `return:update` |

> **Note**: These are illustrative identifiers. Consult your VirtoCommerce installation's **Security → Permissions** section for the exact permission names available in your version. VirtoCommerce modules register their own permissions, so the exact names may vary.

For more details on VirtoCommerce role management, see the [VirtoCommerce Security documentation](https://docs.virtocommerce.org/platform/user-guide/security/).
