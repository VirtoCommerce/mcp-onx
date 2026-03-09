# Known Limitations & Unimplemented Features

This document describes features referenced in test prompts or examples that are **not currently implemented** in the VirtoCommerce adapter, along with workarounds where available.

---

## Hold Order Tool

**Status**: Not implemented as a separate tool — use `update-order` instead.

The MCP test prompts reference a dedicated "Hold Order" tool for placing and releasing order holds. In practice, this is achievable through the existing `update-order` tool by changing the order status.

### Placing a hold

```json
{
  "name": "update-order",
  "arguments": {
    "id": "ORDER-ID",
    "updates": {
      "status": "on_hold"
    }
  }
}
```

### Releasing a hold

```json
{
  "name": "update-order",
  "arguments": {
    "id": "ORDER-ID",
    "updates": {
      "status": "processing"
    }
  }
}
```

### Status mapping

| MCP Status | VirtoCommerce Status |
| ---------- | -------------------- |
| `on_hold`  | `OnHold`             |
| `processing` | `Processing`       |
| `pending`  | `New`                |

A dedicated `hold-order` tool may be added in a future release if additional hold-specific logic is required (e.g., hold reason tracking, automatic hold expiration).

---

## Reserve Inventory Tool

**Status**: Cannot be implemented — requires a VirtoCommerce API that does not yet exist.

The MCP test prompts reference a "Reserve Inventory" tool for creating and releasing inventory reservations. VirtoCommerce has an internal `InventoryReservationService`, but it is **not exposed via a public REST API endpoint**.

### What exists today

- The `reservedQuantity` field is present in the VirtoCommerce inventory model and is tracked internally.
- The `getInventory()` adapter method returns `available` quantity calculated as `inStockQuantity - reservedQuantity`.
- Order creation through VirtoCommerce may trigger internal inventory reservation depending on store configuration.

### What is missing

- No `POST /api/inventory/reserve` or equivalent public endpoint exists in VirtoCommerce.
- Without a server-side API, the adapter cannot create or release inventory reservations programmatically.

### Path to implementation

1. A custom VirtoCommerce module or platform extension must expose `InventoryReservationService` operations via REST API (e.g., `POST /api/inventory/reservations`, `DELETE /api/inventory/reservations/{id}`).
2. Once the API is available, implement `reserveInventory()` and `releaseInventory()` methods in the adapter.
3. Register corresponding MCP tools (`reserve-inventory`, `release-inventory`) in the server.

---

## Split Order Tool

**Status**: Not implemented. Referenced in test prompts but not yet designed.

Splitting an order into multiple shipments for multi-warehouse fulfillment is mentioned in the v1.1.0 roadmap. This would require:

- A new `split-order` MCP tool
- Logic to create multiple shipments from a single order's line items
- Potentially a new VirtoCommerce API endpoint or use of existing shipment creation endpoints
