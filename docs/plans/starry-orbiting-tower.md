# Fix `getProductVariants` mapping — align with VirtoCommerce API

## Context

Audit of `getProductVariants` against the real VirtoCommerce C# source (`vc-module-catalog`) revealed that the adapter's TypeScript models and API calls are misaligned with what the VC indexed search endpoint actually accepts and returns:

1. **SKU search is broken** — adapter sends `codes` field, but `ProductIndexedSearchCriteria` has no such property; it's silently ignored
2. **`WithPrices` responseGroup doesn't exist** — `ItemResponseGroup` enum has no `WithPrices` flag; silently ignored
3. **`CatalogProduct` has no `prices` field** — prices live in a separate Pricing module; the `ProductPrice` interface and `extractPricing()` added earlier are dead code
4. **TypeScript `ProductSearchCriteria`** has fields from the DB-based search criteria, not the indexed search criteria that the actual endpoint uses

## Changes

### 1. `virtocommerce-adapter/src/models/catalog.ts`

- Remove `ProductPrice` interface (added incorrectly in previous session)
- Remove `prices?: ProductPrice[]` from `CatalogProduct`
- Keep `taxType?: string` (exists on real C# model)
- Remove `codes` from `ProductSearchCriteria` (not on indexed search criteria)

### 2. `virtocommerce-adapter/src/models/index.ts`

- Remove `ProductPrice` from exports

### 3. `virtocommerce-adapter/src/mappers/filter.mappers.ts`

- **`mapProductVariantFiltersToSearchCriteria`**: remove `WithPrices` from responseGroup, remove `codes` usage entirely (SKU resolution moves to service layer)
- **`mapProductFiltersToSearchCriteria`**: remove dead `codes` branch (SKU path already early-returns in service)

### 4. `virtocommerce-adapter/src/services/product.service.ts`

- Add `getProductVariantsBySkus()` private method — two-step pattern (same as existing `getProductsByCodes`):
  1. Resolve SKUs to IDs via `resolveSkuProductIdMap()` (`POST /api/catalog/listentries`)
  2. Fetch products by resolved IDs via `POST /api/catalog/search/products` with `searchInVariations: true`
- Update `getProductVariants()` to early-return to `getProductVariantsBySkus()` when `input.skus` provided

### 5. `virtocommerce-adapter/src/transformers/product.transformer.ts`

- Remove `ProductPrice` import
- Remove `extractPricing()` method
- In `fromCatalogProductVariant()`: remove pricing extraction, keep `taxable` mapping from `taxType`

### 6. `virtocommerce-adapter/tests/adapter.test.ts`

- **"should get variants by SKUs"** (line 1129): change single mock to two sequential mocks (listentries + search/products), update assertion to verify two-step flow
- **"should handle variant search failure"** (line 1232): add listentries mock before the failing search mock (test uses `skus` input which now triggers two-step)

## Implementation Order

1. `models/catalog.ts` — remove `ProductPrice`, `prices`, `codes`
2. `models/index.ts` — remove `ProductPrice` export
3. `transformers/product.transformer.ts` — remove pricing code
4. `mappers/filter.mappers.ts` — remove `codes` and `WithPrices`
5. `services/product.service.ts` — add `getProductVariantsBySkus()`
6. `tests/adapter.test.ts` — update SKU test mocks

## Verification

```bash
cd server && npm run build
cd ../virtocommerce-adapter && npm run build
```

Note: `adapter.test.ts` has pre-existing syntax errors (customer section ~line 667) that prevent tests from running. Our changes should not introduce new failures.
