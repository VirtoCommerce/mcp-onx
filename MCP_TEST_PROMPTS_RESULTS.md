# MCP Test Prompts — Verification Results

The file `MCP_TEST_PROMPTS.md` was written for an early version of the server ("Universal OMS MCP Server") with the mock adapter. Below is an analysis of each block of prompts for compatibility with the current state of the MCP server.

---

## Tool Mapping: Document vs Actual Server

| #   | Document               | Actual Tool          | Status             |
| --- | ---------------------- | -------------------- | ------------------ |
| 1   | Get Order Tool         | `get-orders`         | :white_check_mark: |
| 2   | Get Customer Tool      | `get-customers`      | :white_check_mark: |
| 3   | Get Product Tool       | `get-products`       | :white_check_mark: |
| 4   | Get Inventory Tool     | `get-inventory`      | :white_check_mark: |
| 5   | Get Shipment Tool      | `get-fulfillments`   | :white_check_mark: |
| 6   | Get Buyer Tool         | —                    | :white_check_mark: |
| 7   | Capture Order Tool     | `create-sales-order` |                    |
| 8   | Cancel Order Tool      | `cancel-order`       |                    |
| 9   | Update Order Tool      | `update-order`       |                    |
| 10  | Return Order Tool      | `create-return`      |                    |
| 11  | Exchange Order Tool    | —                    |                    |
| 12  | Ship Order Tool        | `fulfill-order`      |                    |
| 13  | Hold Order Tool        | —                    |                    |
| 14  | Split Order Tool       | —                    |                    |
| 15  | Reserve Inventory Tool | —                    |                    |

**5 out of 15 tools from the document do not exist in the current server.** Another 3 have different names.

---

## Test Data

The test data in the document **correctly matches** the mock adapter (`server/src/adapters/mock/mock-data.ts`):

| Entity                    | Document                  | Mock Data                  | Match |
| ------------------------- | ------------------------- | -------------------------- | ----- |
| order_001 / EXT-001       | confirmed, John Smith     | :white_check_mark: Present | Yes   |
| order_002 / ORD-1001      | processing, Sarah Johnson | :white_check_mark: Present | Yes   |
| order_003 / WEB-2024-1002 | shipped, John Smith       | :white_check_mark: Present | Yes   |
| cust_001 John Smith       | john.smith@example.com    | :white_check_mark: Present | Yes   |
| cust_002 Sarah Johnson    | sarah.johnson@example.com | :white_check_mark: Present | Yes   |
| prod_001 / WID-001        | Headphones $199.99        | :white_check_mark: Present | Yes   |
| prod_002 / TSH-002        | T-Shirt $29.99            | :white_check_mark: Present | Yes   |
| prod_003 / COF-003        | Coffee $24.99             | :white_check_mark: Present | Yes   |
| WH001, WH002, WH003       | Warehouses                | :white_check_mark: Present | Yes   |

**Important:** Test data only works with the mock adapter (`ADAPTER_TYPE=built-in`, `ADAPTER_NAME=mock`). With the VirtoCommerce adapter, data will come from the actual VC instance.

---

## Query Tools Test Prompts

### 1. Get Order Tool — :white_check_mark: WORKS (with caveats)

| Prompt                                    | How the agent should call                                              | Result                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| "Get me the details for order EXT-001"    | `get-orders` with `externalIds: ["EXT-001"]`                           | :white_check_mark: Works — `externalIds` maps to VC `outerIds` + `numbers` |
| "Show me order order_002"                 | `get-orders` with `ids: ["order_002"]`                                 | :white_check_mark: Works — direct lookup by ID                             |
| "What's the status of order ORD-1001?"    | `get-orders` with `externalIds: ["ORD-1001"]` or `names: ["ORD-1001"]` | :white_check_mark: Works — `names` maps to `numbers`                       |
| "Can you retrieve order WEB-2024-1002..." | `get-orders` with `externalIds: ["WEB-2024-1002"]`                     | :white_check_mark: Works                                                   |

**Note:** The agent must determine whether the identifier is an internal ID (`order_002`), external ID (`EXT-001`), or order number (`ORD-1001`), and use the corresponding parameter. For natural language prompts, this is the AI agent's responsibility.

---

### 2. Get Customer Tool — :warning: PARTIALLY WORKS

| Prompt                                                                | How the agent should call                                    | Result                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------ |
| "Get customer information for cust_001"                               | `get-customers` with `ids: ["cust_001"]`                     | :white_check_mark: Works |
| "Show me the details for customer john.smith@example.com"             | `get-customers` with `emails: ["john.smith@example.com"]`    | :white_check_mark: Works |
| "Find customer cust_002"                                              | `get-customers` with `ids: ["cust_002"]`                     | :white_check_mark: Works |
| "What information do you have on customer sarah.johnson@example.com?" | `get-customers` with `emails: ["sarah.johnson@example.com"]` | :white_check_mark: Works |

**All prompts work** because they use ID or email. Prompts with name search ("Find John Smith") are not included — and that's correct, since `get-customers` does not support name search.

---

### 3. Get Product Tool — :white_check_mark: WORKS

| Prompt                                                 | How the agent should call               | Result                   |
| ------------------------------------------------------ | --------------------------------------- | ------------------------ |
| "Show me product details for SKU WID-001"              | `get-products` with `skus: ["WID-001"]` | :white_check_mark: Works |
| "Get information about product prod_002"               | `get-products` with `ids: ["prod_002"]` | :white_check_mark: Works |
| "What are the details for the coffee product COF-003?" | `get-products` with `skus: ["COF-003"]` | :white_check_mark: Works |
| "Find product TSH-002 and show me all its attributes"  | `get-products` with `skus: ["TSH-002"]` | :white_check_mark: Works |

**All prompts work** — they use direct lookup by SKU or product ID.

---

### 4. Get Inventory Tool — :white_check_mark: WORKS

| Prompt                                                       | How the agent should call                                        | Result                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| "Check inventory for SKU WID-001 at warehouse WH001"         | `get-inventory` with `skus: ["WID-001"], locationIds: ["WH001"]` | :white_check_mark: Works                         |
| "What's the available stock for TSH-002 in location WH002?"  | `get-inventory` with `skus: ["TSH-002"], locationIds: ["WH002"]` | :white_check_mark: Works                         |
| "Show me inventory levels for COF-003 across all warehouses" | `get-inventory` with `skus: ["COF-003"]` (without locationIds)   | :white_check_mark: Works — returns all locations |
| "Get inventory status for WID-001 at WH003"                  | `get-inventory` with `skus: ["WID-001"], locationIds: ["WH003"]` | :white_check_mark: Works                         |

---

### 5. Get Shipment Tool — :white_check_mark: WORKS

Actual tool name: **`get-fulfillments`** (not "get-shipment").

| Prompt                                                     | How the agent should call                                                                   | Result                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| "Get shipment details for order order_003"                 | `get-fulfillments` with `orderIds: ["order_003"]`                                           | :white_check_mark: Works                              |
| "Show me the shipment information for order WEB-2024-1002" | First `get-orders` with `externalIds: ["WEB-2024-1002"]` to get ID, then `get-fulfillments` | :white_check_mark: Works (two-step)                   |
| "Check if order_001 has been shipped"                      | `get-fulfillments` with `orderIds: ["order_001"]`                                           | :white_check_mark: Works — empty result = not shipped |
| "Find shipment tracking for order EXT-001"                 | Similarly — resolve external ID then get-fulfillments                                       | :white_check_mark: Works (two-step)                   |

**Note:** Prompts use external IDs, but `get-fulfillments` only accepts `orderIds` (internal). The agent must first resolve the external ID via `get-orders`.

---

### 6. Get Buyer Tool — :x: DOES NOT EXIST

| Prompt                                             | Result                                  |
| -------------------------------------------------- | --------------------------------------- |
| "Get buyer information for order order_001"        | :x: The `get-buyer` tool does not exist |
| "Who is the buyer for order ORD-1001?"             | :x: No such tool                        |
| "Show me the buyer details for order_002"          | :x: No such tool                        |
| "Find the customer who placed order WEB-2024-1002" | :x: No such tool                        |

**Workaround:** `get-orders` returns a `customer` object as part of the order (with `includeLineItems: true`, default). The agent can get customer info from the `get-orders` response. A separate "Get Buyer" tool is not needed.

---

## Action Tools Test Prompts

### 7. Capture Order Tool — :white_check_mark: WORKS

Actual name: **`create-sales-order`** (not "capture-order").

| Prompt                                                                                        | How the agent should call                                                                                                                   | Result                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| "Create a new order for customer cust_001 with 2 units of WID-001 shipping to 123 Main St..." | `create-sales-order` with `order: { customer: { id: "cust_001" }, lineItems: [{ sku: "WID-001", quantity: 2 }], shippingAddress: { ... } }` | :white_check_mark: Works |
| "Capture an order for sarah.johnson@example.com with 1 TSH-002 and 2 COF-003"                 | `create-sales-order` with `customer: { email: "..." }, lineItems: [...]`                                                                    | :white_check_mark: Works |
| "Place an order for customer cust_002 with product WID-001, quantity 1..."                    | Similarly                                                                                                                                   | :white_check_mark: Works |

**Note:** `lineItems` must contain `sku` and `quantity`. `unitPrice` is optional in the schema, but without it VirtoCommerce may create an order with zero prices.

---

### 8. Cancel Order Tool — :white_check_mark: WORKS

| Prompt                                                          | How the agent should call                                              | Result                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| "Cancel order order_001 due to customer request"                | `cancel-order` with `orderId: "order_001", reason: "customer request"` | :white_check_mark: Works                                    |
| "Please cancel order EXT-001 - the customer changed their mind" | First resolve EXT-001 to internal ID, then `cancel-order`              | :warning: Two-step — the agent must resolve the external ID |
| "Cancel order ORD-1001 because of inventory issues"             | Similarly — resolve then cancel                                        | :warning: Two-step                                          |

**Note:** `cancel-order` accepts `orderId` (internal ID), not external ID or order number. The agent must first call `get-orders` to resolve.

---

### 9. Update Order Tool — :warning: PARTIALLY WORKS

| Prompt                                                                | How the agent should call                                                                                          | Result                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Update order order_002 to change the quantity of TSH-002 to 3 units" | `update-order` with `id: "order_002", updates: { lineItems: [{ sku: "TSH-002", quantity: 3, unitPrice: 29.99 }] }` | :white_check_mark: Works — `unitPrice` is required in update lineItems                                                                                                                        |
| "Modify order EXT-001 to ship to 789 Broadway..."                     | Resolve EXT-001 then `update-order` with `updates: { shippingAddress: {...} }`                                     | :white_check_mark: Works (two-step)                                                                                                                                                           |
| "Update order ORD-1001 with express shipping"                         | `update-order` with `updates: { shippingClass: "Express" }`                                                        | :warning: Partial — `shippingClass` is part of `ShippingInfoSchema`, but the adapter's `applyUpdatesToOrder` does not handle shipping method changes (only address, status, lineItems, notes) |

---

### 10. Return Order Tool — :x: DOES NOT WORK (stub)

Actual name: **`create-return`**.

| Prompt                                                                        | Result                                                                                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Process a return for order order_003 - customer says the coffee tastes bad"  | :x: `create-return` exists, but the VC adapter returns a hardcoded failure: "createReturn not yet implemented" |
| "Create a return for order WEB-2024-1002 with reason damaged during shipping" | :x: Same — stub                                                                                                |
| "Return order order_001 because the headphones don't work"                    | :x: Same — stub                                                                                                |

**With mock adapter:** Returns work (mock data contains `return_001`, `return_002`, `return_003`). With VirtoCommerce adapter — stub.

---

### 11. Exchange Order Tool — :x: DOES NOT EXIST

| Prompt                                                                       | Result               |
| ---------------------------------------------------------------------------- | -------------------- |
| "Exchange order order_001 - customer wants TSH-002 instead of WID-001"       | :x: No exchange tool |
| "Process an exchange for order ORD-1001 - swap the t-shirt for coffee beans" | :x: No such tool     |
| "Exchange the items in order_002 for different products"                     | :x: No such tool     |

**Note:** An exchange can be modeled as `create-return` (outcome: "exchange") + `create-sales-order`. But `create-return` is a stub in the VC adapter.

---

### 12. Ship Order Tool — :white_check_mark: WORKS

Actual name: **`fulfill-order`** (not "ship-order").

| Prompt                                                                 | How the agent should call                                                                                                    | Result                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| "Mark order order_001 as shipped with tracking number TRK123456789"    | `fulfill-order` with `orderId: "order_001", trackingNumbers: ["TRK123456789"], lineItems: [{ sku: "WID-001", quantity: 1 }]` | :white_check_mark: Works            |
| "Ship order EXT-001 via FedEx with tracking FDX987654321"              | Resolve then `fulfill-order` with `shippingCarrier: "FedEx", trackingNumbers: ["FDX987654321"]`                              | :white_check_mark: Works (two-step) |
| "Process shipment for order_002 using UPS tracking 1Z999AA10123456784" | `fulfill-order` with corresponding parameters                                                                                | :white_check_mark: Works            |

**Note:** `fulfill-order` requires `orderId`, `lineItems` (with SKU + quantity), and `trackingNumbers` — all mandatory. The adapter adds a shipment to the order via the GET -> add shipment -> PUT flow.

---

## Management Tools Test Prompts

### 13. Hold Order Tool — :x: DOES NOT EXIST

| Prompt                                           | Result                  |
| ------------------------------------------------ | ----------------------- |
| "Put order order_001 on hold"                    | :x: No hold/unhold tool |
| "Hold order EXT-001 due to address verification" | :x:                     |
| "Place a hold on order_002"                      | :x:                     |
| "Release the hold on order ORD-1001"             | :x:                     |

**Workaround:** You can use `update-order` with `updates: { status: "on_hold" }`, since `applyUpdatesToOrder` supports status changes. However, it depends on the VirtoCommerce state machine — the transition to "OnHold" may be allowed or disallowed.

---

### 14. Split Order Tool — :x: DOES NOT EXIST

| Prompt                                                         | Result            |
| -------------------------------------------------------------- | ----------------- |
| "Split order order_002 so that 1 TSH-002 ships immediately..." | :x: No split tool |
| "I need to split order_001 into two separate shipments"        | :x:               |
| "Divide order WEB-2024-1002..."                                | :x:               |

**Workaround:** You can create a fulfillment with a subset of items via `fulfill-order` (specifying a subset of line items), leaving the rest unfulfilled. But this is not a split at the order level.

---

### 15. Reserve Inventory Tool — :x: DOES NOT EXIST

| Prompt                                                   | Result                                |
| -------------------------------------------------------- | ------------------------------------- |
| "Reserve 5 units of WID-001 from warehouse WH001"        | :x: No reserve/release inventory tool |
| "Hold 10 units of TSH-002 inventory at location WH002"   | :x:                                   |
| "Reserve 3 COF-003 from WH003 for upcoming order"        | :x:                                   |
| "Release the reservation on 2 units of WID-001 at WH001" | :x:                                   |

---

## Complex Workflow Test Prompts

### Multi-Tool Operations — :warning: PARTIALLY WORK

| Prompt                                                                                                       | Result                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Get order order_001, then check inventory for all its items, and finally ship it with tracking ABC123"      | :white_check_mark: Works — `get-orders` -> extract SKUs -> `get-inventory` -> `fulfill-order`. All three tools exist.                                                                           |
| "Find customer cust_002, show me all their orders, and then check product availability for TSH-002"          | :warning: Partial — `get-customers` works, but "all their orders" requires a `customerIds` filter in `get-orders` (does not exist). `get-inventory` for TSH-002 works.                          |
| "Create a new order for john.smith@example.com with 2 WID-001, then put it on hold for payment verification" | :warning: Partial — `create-sales-order` works. "Put on hold" can be done via `update-order` with `status: "on_hold"`, but there's no guarantee the VC state machine will allow the transition. |

---

### Error Handling Tests — :white_check_mark: WORK

| Prompt                                                 | Result                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| "Get order INVALID_ORDER_ID"                           | :white_check_mark: Will return an empty result or error response                        |
| "Cancel an order that doesn't exist: order_999"        | :white_check_mark: `cancel-order` -> adapter will return "Order not found"              |
| "Check inventory for a non-existent SKU: FAKE-SKU-001" | :white_check_mark: `get-inventory` -> empty array (SKU doesn't resolve to a product ID) |
| "Get customer information for unknown@email.com"       | :white_check_mark: `get-customers` -> empty customers array                             |

---

### Business Logic Tests — :warning: PARTIALLY WORK

| Prompt                                                               | Result                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Cancel order order_003 (already shipped - should fail)"             | :warning: The adapter doesn't check the "shipped" status — it only checks `isCancelled`. It may attempt to cancel and get an error from the VC state machine, or successfully cancel (depends on VC settings). |
| "Ship order order_001 twice (should handle duplicate shipment)"      | :white_check_mark: `fulfill-order` adds a new shipment to the order — two calls will create two shipments. Not an error, but may be undesirable behavior.                                                      |
| "Reserve 1000 units of WID-001 (likely exceeds available inventory)" | :x: `reserve-inventory` does not exist                                                                                                                                                                         |

---

## Final Summary

### By Tool Groups

| Group                    | Total Prompts | Works  | Partial | Does Not Work |
| ------------------------ | ------------- | ------ | ------- | ------------- |
| Query Tools (1-5)        | 20            | 18     | 2       | 0             |
| Get Buyer (6)            | 4             | 0      | 0       | 4             |
| Action Tools (7-12)      | 15            | 6      | 3       | 6             |
| Management Tools (13-15) | 10            | 0      | 0       | 10            |
| Complex Workflows        | 3             | 1      | 2       | 0             |
| Error Handling           | 4             | 4      | 0       | 0             |
| Business Logic           | 3             | 1      | 1       | 1             |
| **TOTAL**                | **59**        | **30** | **8**   | **21**        |

### Key Document Issues

1. **5 non-existent tools** (Get Buyer, Exchange Order, Hold Order, Split Order, Reserve Inventory) — 18 prompts test things that don't exist.
2. **3 tools with incorrect names** — "Get Shipment" is `get-fulfillments`, "Capture Order" is `create-sales-order`, "Ship Order" is `fulfill-order`. The AI agent can figure it out from the description, but the documentation is misleading.
3. **External ID to Internal ID resolution** is not accounted for — many prompts use external IDs (EXT-001, ORD-1001), but write operations (`cancel-order`, `update-order`, `fulfill-order`) require the internal order ID.
4. **`create-return` is a stub** in the VirtoCommerce adapter — return prompts don't work with VC.

### Recommendations

1. **Remove or mark as "planned"** prompts for non-existent tools (6, 11, 13, 14, 15).
2. **Update tool names** in the document: capture -> create-sales-order, ship -> fulfill-order, get-shipment -> get-fulfillments.
3. **Add a note** about the need to resolve external ID to internal ID for write operations.
4. **Separate** prompts for mock adapter and VirtoCommerce adapter (returns only work with mock).
