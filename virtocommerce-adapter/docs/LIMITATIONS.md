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

| MCP Status   | VirtoCommerce Status |
| ------------ | -------------------- |
| `on_hold`    | `OnHold`             |
| `processing` | `Processing`         |
| `pending`    | `New`                |

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

## Fulfillment (Shipment) Status Filtering

**Status**: By design — VirtoCommerce shipment search API does not support status filtering.

The `get-fulfillments` tool accepts a `statuses` filter parameter, but the VirtoCommerce endpoint `POST /api/order/shipments/search` does not support filtering by status server-side. The `mapFulfillmentFiltersToSearchCriteria` mapper intentionally does not map `statuses` to the search criteria.

### Impact

- When `statuses` is passed to `get-fulfillments`, **all** shipments matching other criteria (order ID, date range) are returned regardless of status.
- Client-side status filtering is **not currently implemented** for fulfillments (unlike returns, which do have client-side post-filtering).

### Workaround

Filter fulfillments by status in the AI agent's logic after receiving results from `get-fulfillments`. The `status` field is present on each returned fulfillment object.
