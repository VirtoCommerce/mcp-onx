/**
 * Filter mapping utilities
 * Convert MCP query input filters to VirtoCommerce API query parameters
 */

import type {
  GetOrdersInput,
  GetInventoryInput,
  GetProductsInput,
  GetProductVariantsInput,
  GetCustomersInput,
  GetFulfillmentsInput,
  GetReturnsInput,
} from '@virtocommerce/cof-mcp';
import type { CustomerOrderSearchCriteria, MemberSearchCriteria, ProductSearchCriteria, ShipmentSearchCriteria, ReturnSearchCriteria } from '../models/index.js';

/**
 * Map GetOrdersInput to VirtoCommerce CustomerOrderSearchCriteria
 */
export function mapOrderFiltersToSearchCriteria(input: GetOrdersInput): CustomerOrderSearchCriteria {
  const criteria: CustomerOrderSearchCriteria = {};

  // Map order IDs
  if (input.ids?.length) {
    criteria.ids = input.ids;
  }

  if (input.externalIds?.length) {
    criteria.outerIds = input.externalIds;
  }

  // Map external IDs to numbers (VirtoCommerce uses 'numbers' for order numbers)
  if (input.externalIds?.length) {
    criteria.numbers = input.externalIds;
  }

  // Map statuses
  if (input.statuses?.length) {
    criteria.statuses = input.statuses;
  }

  // Map names (order numbers)
  if (input.names?.length) {
    criteria.numbers = [...(criteria.numbers ?? []), ...input.names];
  }

  // Map date filters
  if (input.createdAtMin) {
    criteria.startDate = input.createdAtMin;
  }
  if (input.createdAtMax) {
    criteria.endDate = input.createdAtMax;
  }

  // Map pagination
  criteria.skip = input.skip ?? 0;
  criteria.take = input.pageSize ?? 20;

  // Set response group for full data
  criteria.responseGroup = 'Full';

  return criteria;
}

/**
 * @deprecated Use mapOrderFiltersToSearchCriteria instead
 * Map GetOrdersInput to generic API query parameters (legacy)
 */
export function mapOrderFilters(input: GetOrdersInput): Record<string, unknown> {
  return {
    ids: input.ids,
    external_ids: input.externalIds,
    statuses: input.statuses,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    limit: input.pageSize,
    offset: input.skip,
  };
}

/**
 * Map GetInventoryInput to API query parameters
 */
export function mapInventoryFilters(input: GetInventoryInput): Record<string, unknown> {
  return {
    skus: input.skus,
    location_ids: input.locationIds,
  };
}

/**
 * Map GetProductsInput to VirtoCommerce ProductSearchCriteria
 */
export function mapProductFiltersToSearchCriteria(input: GetProductsInput): ProductSearchCriteria {
  const criteria: ProductSearchCriteria = {
    responseGroup: 'ItemInfo,ItemAssets,ItemProperties,Links,Variations,Seo',
    searchInVariations: false,
  };

  if (input.ids?.length) {
    criteria.objectIds = input.ids;
  }

  if (input.skus?.length) {
    criteria.searchPhrase = `code:${input.skus!.join(',')}`;
    criteria.searchInVariations = true;
  }

  criteria.skip = input.skip ?? 0;
  criteria.take = input.pageSize ?? 20;

  return criteria;
}

/**
 * @deprecated Use mapProductFiltersToSearchCriteria instead
 * Map GetProductsInput to generic API query parameters (legacy)
 */
export function mapProductFilters(input: GetProductsInput): Record<string, unknown> {
  return {
    ids: input.ids,
    skus: input.skus,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    limit: input.pageSize,
    offset: input.skip,
  };
}

/**
 * Map GetProductVariantsInput to VirtoCommerce ProductSearchCriteria.
 *
 * VirtoCommerce treats variations as nested objects under parent products.
 * - `productIds`: fetch parent products by ID, then extract their variations.
 * - `ids`: search for specific variations by their IDs directly.
 * - `skus`: search via `searchPhrase` in `code:<sku1>,<sku2>` format.
 */
export function mapProductVariantFiltersToSearchCriteria(input: GetProductVariantsInput): ProductSearchCriteria {
  const hasProductIds = !!input.productIds?.length;
  const hasVariantIds = !!input.ids?.length;
  const hasSkus = !!input.skus?.length;

  const criteria: ProductSearchCriteria = {
    responseGroup: 'ItemInfo,ItemAssets,ItemProperties,Variations',
  };

  if (hasProductIds && !hasVariantIds && !hasSkus) {
    // Fetch parent products to extract their variations
    criteria.objectIds = input.productIds;
    criteria.searchInVariations = false;
  } else if (hasVariantIds) {
    // Search for specific variations by ID
    criteria.objectIds = input.ids;
    criteria.searchInVariations = true;
  } else if (hasSkus) {
    // Search variations by SKU code via searchPhrase
    criteria.searchPhrase = `code:${input.skus!.join(',')}`;
    criteria.searchInVariations = true;
  }

  criteria.skip = input.skip ?? 0;
  criteria.take = input.pageSize ?? 20;

  return criteria;
}

/**
 * @deprecated Use mapProductVariantFiltersToSearchCriteria instead
 * Map GetProductVariantsInput to generic API query parameters (legacy)
 */
export function mapProductVariantFilters(input: GetProductVariantsInput): Record<string, unknown> {
  return {
    ids: input.ids,
    skus: input.skus,
    product_ids: input.productIds,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    limit: input.pageSize,
    offset: input.skip,
  };
}

/**
 * Map GetCustomersInput to VirtoCommerce MemberSearchCriteria
 */
export function mapCustomerFiltersToSearchCriteria(input: GetCustomersInput): MemberSearchCriteria {
  const criteria: MemberSearchCriteria = {
    responseGroup: 'Full',
  };

  if (input.ids?.length) {
    criteria.objectIds = input.ids;
  }

  // Use emails as keyword search (VirtoCommerce member search supports keyword matching)
  if (input.emails?.length) {
    criteria.keyword = input.emails.join(' ');
  }

  criteria.skip = input.skip ?? 0;
  criteria.take = input.pageSize ?? 20;
  criteria.deepSearch = true;

  return criteria;
}

/**
 * @deprecated Use mapCustomerFiltersToSearchCriteria instead
 * Map GetCustomersInput to generic API query parameters (legacy)
 */
export function mapCustomerFilters(input: GetCustomersInput): Record<string, unknown> {
  return {
    ids: input.ids,
    emails: input.emails,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    limit: input.pageSize,
    offset: input.skip,
  };
}

/**
 * Map GetFulfillmentsInput to VirtoCommerce ShipmentSearchCriteria
 */
export function mapFulfillmentFiltersToSearchCriteria(input: GetFulfillmentsInput): ShipmentSearchCriteria {
  const criteria: ShipmentSearchCriteria = {
    responseGroup: 'Full',
  };

  if (input.ids?.length) {
    criteria.ids = input.ids;
  }

  // VC ShipmentSearchCriteria supports single orderId, not an array
  if (input.orderIds?.length) {
    criteria.orderId = input.orderIds[0];
  }

  if (input.createdAtMin) {
    criteria.startDate = input.createdAtMin;
  }
  if (input.createdAtMax) {
    criteria.endDate = input.createdAtMax;
  }

  criteria.skip = input.skip ?? 0;
  criteria.take = input.pageSize ?? 20;

  return criteria;
}

/**
 * @deprecated Use mapFulfillmentFiltersToSearchCriteria instead
 * Map GetFulfillmentsInput to generic API query parameters (legacy)
 */
export function mapFulfillmentFilters(input: GetFulfillmentsInput): Record<string, unknown> {
  return {
    ids: input.ids,
    order_ids: input.orderIds,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    limit: input.pageSize,
    offset: input.skip,
  };
}

/**
 * Map GetReturnsInput to VirtoCommerce ReturnSearchCriteria
 *
 * VC Return search supports: objectIds, orderId (single string), keyword.
 * Filters not supported server-side (statuses, outcomes, returnNumbers exact match,
 * temporal filters) must be applied client-side after fetching.
 */
export function mapReturnFiltersToSearchCriteria(input: GetReturnsInput): ReturnSearchCriteria {
  const criteria: ReturnSearchCriteria = {};

  if (input.ids?.length) {
    criteria.objectIds = input.ids;
  }

  // VC supports single orderId, not an array
  if (input.orderIds?.length) {
    criteria.orderId = input.orderIds[0];
  }

  // Use returnNumber as keyword (partial match); exact filtering is done client-side
  if (input.returnNumbers?.length) {
    criteria.keyword = input.returnNumbers[0];
  }

  // Determine whether client-side post-filtering will be needed
  const needsPostFilter = !!(
    input.statuses?.length ||
    input.outcomes?.length ||
    (input.returnNumbers && input.returnNumbers.length > 1) ||
    input.createdAtMin ||
    input.createdAtMax ||
    input.updatedAtMin ||
    input.updatedAtMax
  );

  const pageSize = input.pageSize ?? 20;
  criteria.skip = input.skip ?? 0;
  // Inflate take when post-filtering is needed to ensure enough results
  criteria.take = needsPostFilter ? Math.max(pageSize, 100) : pageSize;

  return criteria;
}

/**
 * @deprecated Use mapReturnFiltersToSearchCriteria instead
 * Map GetReturnsInput to generic API query parameters (legacy)
 */
export function mapReturnFilters(input: GetReturnsInput): Record<string, unknown> {
  return {
    ids: input.ids,
    order_ids: input.orderIds,
    return_numbers: input.returnNumbers,
    statuses: input.statuses,
    outcomes: input.outcomes,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    limit: input.pageSize,
    offset: input.skip,
  };
}
