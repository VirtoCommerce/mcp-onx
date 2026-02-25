# Fix Order Customer Schema + Resolve Product Names by SKU

## Context

Two problems found during end-to-end testing of `create-sales-order`:

1. **Customer schema validation blocks order creation** — `CustomerSchema` inherits `ObjectProps` which makes `createdAt`, `updatedAt`, `tenantId` required. When the LLM passes `order.customer: { id: "...", firstName: "..." }`, the MCP server rejects it with `"must have required property 'createdAt'"`. These timestamp fields make no sense for a customer reference within an order.

2. **Line items missing product name** — VirtoCommerce requires `name` on line items. Currently `resolveSkuProductIdMap` returns only `Map<code, id>`. If the LLM doesn't provide `item.name`, the line item arrives at VC without a name. The product name is already available in the search response and should be captured.

## Changes

### 1. `server/src/schemas/entities/order.ts` — Customer reference schema

Replace `CustomerSchema.partial()` with a proper omit that removes only timestamp/system fields but keeps `id` required:

```typescript
const OrderCustomerRefSchema = CustomerSchema.omit(
  makeZodFieldMap(['createdAt', 'updatedAt', 'tenantId'] as const)
).describe('Customer reference for the order');
```

Result:
- `id`: string (**required**) → maps to VC `customerId`
- `externalId`: string (optional) → fallback customerId
- `firstName`, `lastName`, `email`, `phone`: optional → used to derive `customerName`
- No `createdAt`, `updatedAt`, `tenantId`

Use `OrderCustomerRefSchema` in `OrderCoreSchema.customer`.

Type compatibility: `Customer` (returned by adapter's `toMcpOrder`) is structurally assignable to the ref type — extra properties are allowed by TypeScript structural typing.

### 2. `virtocommerce-adapter/src/services/product.service.ts` — Resolve names with SKUs

Change `resolveSkuProductIdMap` signature:
- **Before:** `resolveSkuProductIdMap(skus): Promise<Map<string, string>>` (code → id)
- **After:** `resolveSkuProductMap(skus): Promise<Map<string, { id: string; name: string }>>` (code → {id, name})

Inside the method: capture `item.name` alongside `item.id` from the search response. The `name` field is a base entity property available with `responseGroup: 'None'`.

Update private `resolveSkusToIds` and `getInventory` to work with the new map shape (extract `.id` from values).

### 3. `virtocommerce-adapter/src/services/order.service.ts` — Pass new map

Update `createSalesOrder` to pass the new `Map<string, { id: string; name: string }>` to the transformer.

### 4. `virtocommerce-adapter/src/transformers/order.transformer.ts` — Use resolved names

Update `fromCreateSalesOrderInput`:
- `skuProductIdMap` parameter type → `Map<string, { id: string; name: string }>`
- Line item mapping: `productId: resolved?.id`, `name: item.name ?? resolved?.name ?? item.sku`

This ensures every line item has a name even if the LLM only passes SKU + quantity.

### 5. `virtocommerce-adapter/tests/adapter.test.ts` — Update mocks

Update test at ~line 1738 (order creation with minimal input) to include customer data since the adapter now validates it.

Update any mock data that uses the old `skuProductIdMap` shape if directly asserted.

## Files

| File | Package | Change |
|------|---------|--------|
| `server/src/schemas/entities/order.ts` | server | Replace `.partial()` with `.omit()` on customer |
| `virtocommerce-adapter/src/services/product.service.ts` | adapter | Return `{id, name}` from SKU resolution |
| `virtocommerce-adapter/src/services/order.service.ts` | adapter | Pass new map shape to transformer |
| `virtocommerce-adapter/src/transformers/order.transformer.ts` | adapter | Use resolved name as fallback |
| `virtocommerce-adapter/tests/adapter.test.ts` | adapter | Adjust mocks |

## Verification

```bash
cd server && npm run build
cd ../virtocommerce-adapter && npm run build
```

End-to-end: restart MCP server, test `create-sales-order` with customer `{ id, firstName, lastName }` — no more `createdAt` validation error. Line items should have product names resolved from catalog.
