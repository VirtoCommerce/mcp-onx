# VirtoCommerce Adapter API Reference

Maps `@virtocommerce/mcp-onx` adapter methods to the VirtoCommerce Platform REST API.

## Table of Contents

- [VirtoCommerce API Endpoints](#virtocommerce-api-endpoints)
- [Adapter Method → API Call Mapping](#adapter-method--api-call-mapping)
- [Status Mappings](#status-mappings)
- [Data Transformation Reference](#data-transformation-reference)
- [Filter / Search Mapping](#filter--search-mapping)
- [Implementation Patterns](#implementation-patterns)
- [Error Codes](#error-codes)

---

## VirtoCommerce API Endpoints

### Platform / Infrastructure

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| GET | `/health` | `connect()`, `healthCheck()` |
| GET | `/api/stores/{storeId}` | `connect()` — when `workspace` is set |
| GET | `/api/platform/common/countries` | `connect()` — address resolution |

### Order Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| POST | `/api/order/customerOrders/search` | `getOrders()` |
| GET | `/api/order/customerOrders/{id}` | `cancelOrder()`, `updateOrder()`, `fulfillOrder()`, `createReturn()` |
| POST | `/api/order/customerOrders` | `createSalesOrder()` |
| PUT | `/api/order/customerOrders` | `cancelOrder()`, `updateOrder()`, `fulfillOrder()` |

### Shipment Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| POST | `/api/order/shipments/search` | `getFulfillments()` |

### Customer / Members Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| GET | `/api/members/{id}` | `createSalesOrder()` — customer enrichment |
| POST | `/api/members/search` | `getCustomers()`, `getOrders()` — customer enrichment |

### Catalog Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| POST | `/api/catalog/search/products` | `getProducts()`, `getProductVariants()`, `getInventory()`, SKU resolution |

### Pricing Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| POST | `/api/pricing/evaluate` | `createSalesOrder()` — optional price lookup |

### Inventory Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| POST | `/api/inventory/search` | `getInventory()` |

### Return Module

| Method | Endpoint | Used By |
| ------ | -------- | ------- |
| PUT | `/api/return/` | `createReturn()` |
| GET | `/api/return/{id}` | `createReturn()` — re-fetch after save |
| POST | `/api/return/search` | `getReturns()` |

---

## Adapter Method → API Call Mapping

### Lifecycle

| Method | API Calls | Flow |
| ------ | --------- | ---- |
| `connect()` | GET `/health` → GET `/api/stores/{workspace}` → GET `/api/platform/common/countries` | Verify API → load store config (if workspace set) → build country lookup maps |
| `disconnect()` | — | Sets connected flag to false |
| `healthCheck()` | GET `/health` | Returns `HealthStatus` with `api_connection` and `authentication` checks |

### Actions

| Method | API Calls | Flow |
| ------ | --------- | ---- |
| `createSalesOrder()` | GET `/api/members/{customerId}` → POST `/api/catalog/search/products` → POST `/api/pricing/evaluate` → POST `/api/order/customerOrders` | Fetch customer for enrichment → resolve SKUs to product IDs → evaluate prices → create order |
| `cancelOrder()` | GET `/api/order/customerOrders/{id}` → PUT `/api/order/customerOrders` → GET `/api/order/customerOrders/{id}` | 3-step: fetch → set cancelled fields → save → re-fetch |
| `updateOrder()` | GET `/api/order/customerOrders/{id}` → PUT `/api/order/customerOrders` → GET `/api/order/customerOrders/{id}` | 3-step: fetch → apply updates → save → re-fetch |
| `fulfillOrder()` | GET `/api/order/customerOrders/{id}` → PUT `/api/order/customerOrders` → GET `/api/order/customerOrders/{id}` | Fetch order → add new shipment → save → re-fetch to identify new shipment |
| `createReturn()` | GET `/api/order/customerOrders/{orderId}` → PUT `/api/return/` → GET `/api/return/{id}` | Fetch order for line item resolution → save return → re-fetch |

### Queries

| Method | API Calls | Flow |
| ------ | --------- | ---- |
| `getOrders()` | POST `/api/order/customerOrders/search` → POST `/api/members/search` | Search orders → batch-fetch customers → enrich + transform |
| `getCustomers()` | POST `/api/members/search` | Search members → client-side email post-filter → transform |
| `getProducts()` | POST `/api/catalog/search/products` | Search catalog → transform to MCP products |
| `getProductVariants()` | POST `/api/catalog/search/products` | Search by productIds / variantIds / SKUs → extract variations → transform |
| `getInventory()` | POST `/api/catalog/search/products` → POST `/api/inventory/search` | Resolve SKUs → fetch inventory → calculate available quantities |
| `getFulfillments()` | POST `/api/order/shipments/search` (per orderId) | Loop per orderId → search shipments → filter by storeId → transform |
| `getReturns()` | POST `/api/return/search` (per orderId) → GET `/api/order/customerOrders/{id}` | Loop per orderId → search returns → client-side post-filter → fetch orders for enrichment → transform |

---

## Status Mappings

### Order Status

| VirtoCommerce | MCP | Direction |
| ------------- | --- | --------- |
| `New` | `pending` | ↔ |
| `Not payed` | `not_payed` | ↔ |
| `Pending` | `pending_approval` | ↔ |
| `Processing` | `processing` | ↔ |
| `Ready to send` | `ready_to_send` | ↔ |
| `Cancelled` | `cancelled` | ↔ |
| `Partially sent` | `partially_shipped` | ↔ |
| `Completed` | `completed` | ↔ |
| `Shipped` | `shipped` | ↔ |
| `Delivered` | `delivered` | ↔ |
| `OnHold` | `on_hold` | ↔ |
| `Refunded` | `refunded` | ↔ |
| `PartiallyShipped` | `partially_shipped` | → only |
| `PartiallyDelivered` | `partially_delivered` | → only |

> VirtoCommerce uses PascalCase statuses. The adapter normalizes to lowercase. VirtoCommerce accepts any string for order status, so non-standard values pass through.

### Shipment Status

| VirtoCommerce | MCP |
| ------------- | --- |
| `New` | `pending` |
| `PickPack` | `processing` |
| `ReadyToSend` | `ready_to_send` |
| `Sent` | `shipped` |
| `Cancelled` | `cancelled` |
| `Shipped` | `shipped` |
| `Delivered` | `delivered` |
| `OnHold` | `on_hold` |
| `PartiallyShipped` | `partially_shipped` |

> Shipment status mapping is one-directional (VC → MCP). If an unknown status is received, it passes through as-is.

### Return Status

| VirtoCommerce | MCP | Direction |
| ------------- | --- | --------- |
| `New` | `requested` | ↔ |
| `Approved` | `approved` | ↔ |
| `Processing` | `processing` | ↔ |
| `Completed` | `completed` | ↔ |
| `Canceled` | `cancelled` | ↔ |

Additional MCP → VC reverse mappings:

| MCP | VirtoCommerce |
| --- | ------------- |
| `pending` | `New` |
| `canceled` | `Canceled` |
| `declined` | `Canceled` |

---

## Data Transformation Reference

### Order (VC `CustomerOrder` → MCP `Order`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `outerId` | `externalId` | |
| `number` | `name` | |
| `status` | `status` | Via `STATUS_MAP` |
| `total` | `totalPrice` | |
| `currency` | `currency` | |
| `customerId` | `customer.id` | Enriched from Contact when available |
| `customerName` | `customer.lastName` | Fallback when Contact not loaded |
| `shipments[0].deliveryAddress` | `shippingAddress` | First shipment only |
| `shipments[0].shippingMethod.name` | `shippingCarrier` | Falls back to `shipmentMethodCode` |
| `shipments[0].shipmentMethodOption` | `shippingClass` | |
| `shipments[0].shipmentMethodCode` | `shippingCode` | |
| `shipments[0].price` | `shippingPrice` | |
| `shipments[0].comment` | `shippingNote` | |
| `addresses[0]` | `billingAddress` | First order-level address |
| `items[]` | `lineItems[]` | See line item mapping below |
| `createdDate` | `createdAt` | |
| `modifiedDate` | `updatedAt` | |
| `dynamicProperties[]` | `customFields[]` | Property name + first value |
| `comment` | `orderNote` | |

### Order Line Item (VC `LineItem` → MCP `OrderLineItem`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | Falls back to `{orderId}-{sku}-{index}` |
| `sku` | `sku` | |
| `quantity` | `quantity` | |
| `price` | `unitPrice` | |
| `extendedPrice` | `totalPrice` | Falls back to `price * quantity` |
| `name` | `name` | |

### Order Creation (MCP `CreateSalesOrderInput` → VC `CustomerOrder`)

| MCP Field | VC Field | Notes |
| --------- | -------- | ----- |
| `order.externalId` | `outerId` | |
| `order.name` | `number` | Falls back to `externalId` or `ORD-{timestamp}` |
| `order.status` | `status` | Via `REVERSE_STATUS_MAP`; defaults to `New` |
| `order.currency` | `currency` | Defaults to `USD` |
| `order.totalPrice` | `total` | |
| `order.subTotalPrice` | `subTotal` | |
| `order.customer.id` | `customerId` | Falls back to `customer.externalId` |
| `order.lineItems[]` | `items[]` | SKUs resolved to `productId` via product search |
| `order.shippingAddress` | `shipments[0].deliveryAddress` | Falls back to customer default shipping address |
| `order.billingAddress` | `addresses[]` / `inPayments[0].billingAddress` | Falls back to customer default billing address |
| `order.shippingCarrier` | `shipments[0].shipmentMethodCode` | |
| `order.shippingPrice` | `shipments[0].price` | |
| `order.orderNote` | `comment` | |
| `order.giftNote` + `order.shippingNote` | `shipments[0].comment` | Joined with newline, max 2048 chars |
| — | `inPayments[0]` | Auto-generated: `DefaultManualPaymentMethod`, `price=0` |

### Customer (VC `Contact` → MCP `Customer`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `outerId` | `externalId` | |
| `firstName` | `firstName` | |
| `lastName` | `lastName` | |
| `emails[0]` | `email` | First email only |
| `phones[0]` | `phone` | First phone only |
| `addresses[]` | `addresses[]` | Via `AddressTransformer` |
| `groups[]` | `tags` | |
| `status` | `status` | Defaults to `active` |
| `createdDate` | `createdAt` | |
| `modifiedDate` | `updatedAt` | |
| `dynamicProperties[]` | `customFields[]` | Property name + first value |

### Fulfillment (VC `Shipment` → MCP `Fulfillment`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `outerId` | `externalId` | |
| `customerOrderId` | `orderId` | Falls back to `customerOrder.id` |
| `status` | `status` | Via `SHIPMENT_STATUS_MAP` in `fulfillment.transformer.ts` |
| `trackingNumber` | `trackingNumbers[]` | Single value wrapped in array |
| `items[]` | `lineItems[]` | Uses `lineItem.sku` if available |
| `fulfillmentCenterId` | `locationId` | |
| `deliveryAddress` | `shippingAddress` | Via `AddressTransformer` |
| `shippingMethod.name` | `shippingCarrier` | Falls back to `shipmentMethodCode` |
| `shipmentMethodOption` | `shippingClass` | |
| `shipmentMethodCode` | `shippingCode` | |
| `price` | `shippingPrice` | |
| `comment` | `shippingNote` | |
| `deliveryDate` | `expectedDeliveryDate` | |
| `createdDate` | `createdAt` | |
| `modifiedDate` | `updatedAt` | |

### Product (VC `CatalogProduct` → MCP `Product`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `outerId` | `externalId` | |
| `code` | `sku` | |
| `name` | `name` | |
| `reviews[]` | `description` | Prefers `FullReview` type content |
| `images[]` | `images[]` | Extracts URLs |
| `links[]` | `categories[]` | Extracts category names |
| `isActive` / `isBuyable` | `status` | `inactive` if !isActive, `draft` if !isBuyable, else `active` |
| `properties[name=tags]` | `tags` | |
| `properties[type=Product]` | `customFields` | |
| `variations[]` | `variants[]` | Nested variations |
| `createdDate` | `createdAt` | |
| `modifiedDate` | `updatedAt` | |

### Product Variant (VC `CatalogProduct` variation → MCP `ProductVariant`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `code` | `sku` | |
| `name` | `name` | |
| `properties[type=Variation]` | `options[]` | Selected variant options |
| `weight` + `weightUnit` | `weight` | Supports lb, oz, kg, g |
| `dimensions` | `dimensions` | Supports cm, in, ft |
| `taxType` | `taxable` | `true` if taxType present |
| `trackInventory` | `inventoryNotTracked` | `true` if trackInventory is `false` |

### Inventory (VC `InventoryInfo` → MCP `InventoryItem`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `productId` | `productId` | |
| — | `sku` | Resolved from product search (not in InventoryInfo) |
| `inStockQuantity` | `onHand` | |
| `reservedQuantity` | `unavailable` | |
| `inStockQuantity - reservedQuantity` | `available` | Min 0 |
| `fulfillmentCenterId` | `locationId` | |
| `modifiedDate` | `updatedAt` | |

### Return (VC `VcReturn` → MCP `Return`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `number` | `returnNumber` | |
| `orderId` | `orderId` | |
| `status` | `status` | Via `RETURN_STATUS_MAP` in `return.transformer.ts` |
| `resolution` | `outcome` | |
| `lineItems[]` | `returnLineItems[]` | Enriched with order line item data (sku, name) |
| `createdDate` | `createdAt` / `requestedAt` | |
| `modifiedDate` | `updatedAt` | |

### Return Line Item (VC `VcReturnLineItem` → MCP `ReturnLineItem`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `id` | `id` | |
| `orderLineItemId` | `orderLineItemId` | |
| — | `sku` | Resolved from order line items |
| `quantity` | `quantityReturned` | |
| `reason` | `returnReason` | Defaults to `unknown` |
| `price` | `unitPrice` | |
| — | `name` | Resolved from order line items |

### Address (VC `Address` ↔ MCP `Address`)

| VC Field | MCP Field | Notes |
| -------- | --------- | ----- |
| `line1` | `address1` | |
| `line2` | `address2` | |
| `city` | `city` | |
| `countryName` | `country` | Falls back to `countryCode` |
| `email` | `email` | |
| `name` | `firstName` + `lastName` | Split via `splitName()` |
| `phone` | `phone` | |
| `regionName` | `stateOrProvince` | |
| `postalCode` | `zipCodeOrPostalCode` | Falls back to `zip` |
| `organization` | `company` | |

For VC → MCP direction, `name` is split into `firstName`/`lastName`.
For MCP → VC direction, `firstName` + `lastName` are composed into `name`. Country values are resolved via the country lookup maps (code ↔ name).

---

## Filter / Search Mapping

### Orders (`GetOrdersInput` → `CustomerOrderSearchCriteria`)

| MCP Input | VC SearchCriteria | Notes |
| --------- | ----------------- | ----- |
| `ids` | `ids` | |
| `externalIds` | `outerIds` | |
| `statuses` | `statuses` | Reverse-mapped to VirtoCommerce PascalCase |
| `names` | `numbers` | |
| `createdAtMin` | `startDate` | |
| `createdAtMax` | `endDate` | |
| `skip` | `skip` | Default: 0 |
| `pageSize` | `take` | Default: 20 |
| — | `responseGroup` | Always `Full` |

### Products (`GetProductsInput` → `ProductSearchCriteria`)

| MCP Input | VC SearchCriteria | Notes |
| --------- | ----------------- | ----- |
| `ids` | `objectIds` | |
| `skus` | `searchPhrase` | Format: `code:sku1,sku2,...` |
| — | `searchInVariations` | `true` when SKUs provided |
| `skip` | `skip` | Default: 0 |
| `pageSize` | `take` | Default: 20 |
| — | `responseGroup` | `ItemInfo,ItemAssets,ItemProperties,Links,Variations,Seo` |

### Product Variants (`GetProductVariantsInput` → `ProductSearchCriteria`)

| MCP Input | VC SearchCriteria | Notes |
| --------- | ----------------- | ----- |
| `productIds` | `objectIds` | Fetches parent products, extracts `variations[]` |
| `ids` (variant IDs) | `objectIds` + `searchInVariations=true` | Direct variation search |
| `skus` | `searchPhrase` + `searchInVariations=true` | Format: `code:sku1,sku2,...` |
| `skip` | `skip` | Default: 0 |
| `pageSize` | `take` | Default: 20 |
| — | `responseGroup` | `ItemInfo,ItemAssets,ItemProperties,Variations` |

### Customers (`GetCustomersInput` → `MemberSearchCriteria`)

| MCP Input | VC SearchCriteria | Notes |
| --------- | ----------------- | ----- |
| `ids` | `objectIds` | |
| `emails` | `keyword` | Space-joined for partial matching; exact match is post-filtered client-side |
| `skip` | `skip` | Default: 0 |
| `pageSize` | `take` | Default: 20 |
| — | `memberTypes` | Always `['Contact']` — excludes Organizations, Employees, Vendors |
| — | `deepSearch` | Always `true` |
| — | `responseGroup` | Always `Full` |

### Inventory (`GetInventoryInput`)

Inventory search is a multi-step process handled by `ProductService`:

1. Resolve `skus` → product IDs via `POST /api/catalog/search/products`
2. Search inventory via `POST /api/inventory/search` with resolved product IDs

| MCP Input | VC InventorySearchCriteria | Notes |
| --------- | ------------------------- | ----- |
| `skus` | `productIds` (resolved) | SKUs are first resolved to product IDs via catalog search |
| `locationIds` | `fulfillmentCenterIds` | |
| — | `take` | `productIds.length * 10` (multiple FCs per product) |

### Fulfillments (`GetFulfillmentsInput` → `ShipmentSearchCriteria`)

| MCP Input | VC SearchCriteria | Notes |
| --------- | ----------------- | ----- |
| `ids` | `ids` | |
| `orderIds` | `orderId` | **Single value only** — adapter loops per orderId |
| `createdAtMin` | `startDate` | |
| `createdAtMax` | `endDate` | |
| `skip` | `skip` | Default: 0 |
| `pageSize` | `take` | Default: 20 |
| — | `responseGroup` | Always `Full` |

### Returns (`GetReturnsInput` → `ReturnSearchCriteria`)

| MCP Input | VC SearchCriteria | Notes |
| --------- | ----------------- | ----- |
| `ids` | `objectIds` | |
| `orderIds` | `orderId` | **Single value only** — adapter loops per orderId |
| `returnNumbers` | `keyword` | First value only, partial match |
| `skip` | `skip` | Default: 0 |
| `pageSize` | `take` | Inflated to max(pageSize, 100) when post-filtering needed |

**Client-side post-filters** (not supported by VC search API):
- `statuses` — case-insensitive normalization
- `outcomes` — resolution field matching
- `returnNumbers` — exact match (keyword is partial)
- `createdAtMin` / `createdAtMax` — temporal filtering
- `updatedAtMin` / `updatedAtMax` — temporal filtering

---

## Implementation Patterns

### Three-Step Order Update

`cancelOrder()`, `updateOrder()`, and `fulfillOrder()` all follow the same pattern:

1. **GET** the current order from VirtoCommerce
2. **Modify** the order object in memory (set cancelled fields, apply updates, add shipment)
3. **PUT** the full order back to VirtoCommerce
4. **GET** again to return the server-recalculated state (totals, dates)

VirtoCommerce does not support PATCH — the entire order document must be sent.

### SKU Resolution & Pricing Evaluation

When creating an order, line item SKUs must be resolved to VirtoCommerce product IDs:

1. Search products via `POST /api/catalog/search/products` with `searchPhrase: "code:sku1,sku2,..."`
2. Build a `Map<sku, { id, name, price? }>`
3. Optionally evaluate prices via `POST /api/pricing/evaluate` with `PriceEvaluationContext` (storeId, catalogId, currency, customerId)
4. Sale price is preferred over list price
5. Pricing failure is **non-fatal** — the order is still created with input prices or zero

### Customer Enrichment

For `createSalesOrder()`:
1. Fetch the customer Contact via `GET /api/members/{customerId}`
2. Extract `defaultShippingAddressId` and `defaultBillingAddressId`
3. Use as fallback addresses when input addresses are not provided
4. Strip identity fields (`key`, `outerId`) from Contact addresses before copying to order

For `getOrders()`:
1. Collect unique `customerId` values from search results
2. Batch-fetch all customers via `POST /api/members/search`
3. Build `Map<customerId, Contact>` for enrichment during transformation

### Address Identity Stripping

When copying a Contact's default address to a new order, the adapter removes `key` and `outerId` fields. This prevents VirtoCommerce's Entity Framework Core from creating duplicate `AddressEntity` records with the same identity.

### Multi-OrderId Looping

VirtoCommerce shipment and return search APIs accept a single `orderId`, not an array. When the MCP input contains multiple `orderIds`, the adapter:

1. Loops through each orderId
2. Makes separate search requests
3. Aggregates results

### Client-Side Post-Filtering

Some MCP filter fields are not supported by VirtoCommerce's search APIs:

- **Returns**: statuses, outcomes, multiple return numbers, temporal filters
- **Customers**: exact email matching (VC keyword search is partial)

The adapter inflates `take` size to ensure enough raw results, then applies filters in memory before pagination.

### Payment Stub

Every created order includes a payment document:
- `gatewayCode`: `DefaultManualPaymentMethod`
- `price`: `0` (this is the payment surcharge, not the amount)
- VirtoCommerce calculates `total = subTotal + shippingTotal + paymentTotal`, so payment price must be 0 to avoid doubling

---

## Error Codes

| Code | When Thrown |
| ---- | ---------- |
| `CONNECTION_FAILED` | `connect()` fails, API unreachable |
| `AUTHENTICATION_FAILED` | Invalid API key or unauthorized response |
| `INVALID_REQUEST` | Malformed input (e.g., missing required fields) |
| `ORDER_NOT_FOUND` | Order ID not found during cancel/update/fulfill |
| `PRODUCT_NOT_FOUND` | SKU resolution returns no products |
| `CUSTOMER_NOT_FOUND` | Customer ID not found during enrichment |
| `INSUFFICIENT_INVENTORY` | Not enough stock for requested quantity |
| `INVALID_ORDER_STATE` | Operation not valid for current order status (e.g., cancel already cancelled) |
| `RETURN_NOT_FOUND` | Return ID not found |
| `API_ERROR` | Generic VirtoCommerce API error (non-specific HTTP failure) |
| `TIMEOUT` | Request exceeded configured timeout |
| `UNKNOWN_ERROR` | Unclassified error |

All errors are wrapped in `AdapterError` from `@virtocommerce/cof-mcp` and include the original error as context.
