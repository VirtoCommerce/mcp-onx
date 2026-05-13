# Implement VirtoCommerce Return Operations

## Context

The MCP server layer for returns is complete (tools, schemas, ServiceOrchestrator), but the VirtoCommerce adapter has only stub implementations that immediately return `failure("not yet implemented")`. The adapter uses wrong endpoints (`/returns` instead of `/api/return/...`), has no VC Return models, no transformer, and incorrect filter mapping.

The VirtoCommerce Return Module (`vc-module-return`) exposes:
- `PUT /api/return/` — Create/Update (SaveChanges pattern)
- `POST /api/return/search` — Search with `ReturnSearchCriteria`
- `GET /api/return/{id}` — Get by ID (includes calculated `availableQuantity`)
- `GET /api/return/available-quantities/{orderId}` — Available quantities per line item

Goal: make `create-return` and `get-returns` MCP tools work end-to-end against VirtoCommerce.

## Files

| File | Action | Description |
|------|--------|-------------|
| `src/models/return.ts` | **CREATE** | VC Return domain models |
| `src/models/index.ts` | MODIFY | Export return models |
| `src/transformers/return.transformer.ts` | **CREATE** | VC ↔ MCP bidirectional mapping |
| `src/transformers/index.ts` | MODIFY | Export ReturnTransformer |
| `src/mappers/filter.mappers.ts` | MODIFY | Replace `mapReturnFilters` with `mapReturnFiltersToSearchCriteria` |
| `src/mappers/index.ts` | MODIFY | Export new mapper |
| `src/services/return.service.ts` | **REWRITE** | Full implementation against VC API |
| `src/adapter.ts` | MODIFY | Pass `tenantId` to ReturnService |
| `src/types.ts` | MODIFY | Add `RETURN_NOT_FOUND` error code |

All files under `virtocommerce-adapter/`.

---

## 1. `src/models/return.ts` — VC Domain Models

Interfaces matching the VC Return Module C# models (JSON camelCase):

```typescript
import type { AuditableEntity } from './base.js';
import type { CustomerOrder } from './order.js';

export interface VcReturn extends AuditableEntity {
  number?: string;           // Auto-generated "RET220314-00001"
  orderId?: string;
  status?: string;           // PascalCase: New, Approved, Processing, Completed, Canceled
  resolution?: string;       // Free-text → maps to MCP "outcome"
  order?: CustomerOrder;     // Only with WithOrders response group
  lineItems?: VcReturnLineItem[];
}

export interface VcReturnLineItem extends AuditableEntity {
  returnId?: string;
  orderLineItemId?: string;
  quantity?: number;          // int
  availableQuantity?: number; // Calculated server-side
  price?: number;             // decimal
  reason?: string;
}

export interface ReturnSearchCriteria {
  orderId?: string;           // Single string (NOT array)
  objectIds?: string[];       // Return IDs
  keyword?: string;           // Searches Number and Status
  skip?: number;
  take?: number;
  sort?: string;
}

export interface ReturnSearchResult {
  totalCount?: number;
  results?: VcReturn[];
}

export interface ReturnSaveResponse {
  id: string;
}
```

## 2. `src/transformers/return.transformer.ts` — Bidirectional Mapping

Extends `BaseTransformer`. Key methods:

### Status Maps

```
VC PascalCase  →  MCP lowercase
New            →  requested
Approved       →  approved
Processing     →  processing
Completed      →  completed
Canceled       →  cancelled
```

Reverse: `requested`/`pending` → `New`, `cancelled`/`canceled`/`declined` → `Canceled`

### `toMcpReturn(vcReturn, order?)` — VC → MCP

| VcReturn | MCP Return |
|----------|------------|
| `id` | `id` |
| `number` | `returnNumber` |
| `orderId` | `orderId` |
| `status` | `status` (via status map) |
| `resolution` | `outcome` |
| `lineItems[]` | `returnLineItems[]` (via `toMcpReturnLineItem`) |
| `createdDate` | `createdAt`, `requestedAt` |
| `modifiedDate` | `updatedAt` |
| — | `tenantId` (from transformer) |

### `toMcpReturnLineItem(vcItem, orderLineItems?)` — VC → MCP

| VcReturnLineItem | MCP ReturnLineItem |
|------------------|-------------------|
| `id` | `id` |
| `orderLineItemId` | `orderLineItemId` |
| `quantity` | `quantityReturned` |
| `price` | `unitPrice` |
| `reason` | `returnReason` |
| — | `sku` (lookup from `order.items` by `orderLineItemId`) |
| — | `name` (lookup from `order.items` by `orderLineItemId`) |

**Key:** VC `ReturnLineItem` has no `sku`/`name`. Resolved from the order's line items by matching `orderLineItemId` → `item.id`.

### `fromCreateReturnInput(input, order)` — MCP → VC

```
{
  orderId: input.return.orderId,
  status: reverseMapStatus(input.return.status) ?? 'New',
  resolution: input.return.outcome,
  lineItems: input.return.returnLineItems.map(item => ({
    orderLineItemId: item.orderLineItemId,
    quantity: item.quantityReturned,
    reason: item.returnReason,
    price: item.unitPrice ?? orderLineItem.price ?? 0  // fallback to order
  }))
}
```

## 3. `src/mappers/filter.mappers.ts` — Search Criteria Mapping

Replace `mapReturnFilters` with `mapReturnFiltersToSearchCriteria`:

| MCP GetReturnsInput | VC ReturnSearchCriteria | Strategy |
|---------------------|------------------------|----------|
| `ids` | `objectIds` | Direct |
| `orderIds[0]` | `orderId` | First only (VC: single string) |
| `returnNumbers[0]` | `keyword` | Partial; post-filter for exact |
| `statuses` | — | Client-side post-filter |
| `outcomes` | — | Client-side post-filter |
| `createdAtMin/Max` | — | Client-side post-filter |
| `pageSize` | `take` | Inflate when post-filtering needed |
| `skip` | `skip` | Direct |

When post-filtering is needed, `take` is inflated to `max(pageSize, 100)` to fetch enough results.

## 4. `src/services/return.service.ts` — Full Implementation

### `createReturn(input)` Flow

```
1. Validate input.return.orderId present
2. Fetch order: GET /api/order/customerOrders/{orderId}
   → failure if not found
3. Transform: transformer.fromCreateReturnInput(input, order)
   → price fallback from order line items
4. Save: PUT /api/return/ (body = VcReturn without id)
   → response: { id: string }
5. Fetch created: GET /api/return/{id}
6. Transform: transformer.toMcpReturn(vcReturn, order)
7. Return success
```

### `getReturns(input)` Flow

```
1. If multiple orderIds → loop per orderId (same as FulfillmentService pattern)
2. Build criteria: mapReturnFiltersToSearchCriteria(input)
3. Search: POST /api/return/search
4. Collect unique orderIds from results
5. Fetch orders for SKU resolution: GET /api/order/customerOrders/{orderId} per ID
   → build Map<orderId, CustomerOrder>
6. Post-filter by statuses, outcomes, returnNumbers, temporal filters
7. Apply pagination to filtered results
8. Transform: transformer.toMcpReturns(vcReturns, orderMap)
9. Return success
```

### Private helpers

- `fetchOrder(orderId)` — `GET /api/order/customerOrders/{orderId}`, returns `CustomerOrder | null`
- `fetchReturnById(returnId)` — `GET /api/return/{returnId}`, returns `VcReturn | null`

## 5. `src/adapter.ts` — Wiring

Change constructor: `new ReturnService(this.client)` → `new ReturnService(this.client, tenantId)`

Add in `updateOptions()`: `this.returnService.setTenantId(tenantId)`

## 6. `src/types.ts` — Error Code

Add `RETURN_NOT_FOUND = 'RETURN_NOT_FOUND'` to `ErrorCode` enum.

## Verification

```bash
cd virtocommerce-adapter && npm run build   # TypeScript compilation
cd ../server && npm run build               # Server (dependency) compilation
```

End-to-end: restart MCP server, test:
1. `get-orders` for an order ID → get line item IDs and SKUs
2. `create-return` with `{ orderId, outcome: "refund", returnLineItems: [{ orderLineItemId, sku, quantityReturned: 1, returnReason: "quality_issue" }] }` → should create return in VC with status "New"
3. `get-returns` with `{ orderIds: ["..."] }` → should return the created return with SKUs resolved
