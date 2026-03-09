/**
 * Filter mapping utilities
 * Convert MCP query input filters to VirtoCommerce API query parameters
 */

import type {
  GetOrdersInput,
  GetProductsInput,
  GetProductVariantsInput,
  GetCustomersInput,
  GetFulfillmentsInput,
  GetReturnsInput,
} from '@virtocommerce/cof-mcp';
import type { CustomerOrderSearchCriteria, MemberSearchCriteria, ProductSearchCriteria, ShipmentSearchCriteria, ReturnSearchCriteria } from '../models/index.js';
import { REVERSE_STATUS_MAP } from '../types.js';

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

  // Map statuses: convert MCP normalized statuses to VirtoCommerce PascalCase
  if (input.statuses?.length) {
    criteria.statuses = input.statuses.map((s) => REVERSE_STATUS_MAP[s] ?? s);
  }

  // Map names (order numbers)
  if (input.names?.length) {
    criteria.numbers = input.names;
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
 * Map GetCustomersInput to VirtoCommerce MemberSearchCriteria
 */
export function mapCustomerFiltersToSearchCriteria(input: GetCustomersInput): MemberSearchCriteria {
  const criteria: MemberSearchCriteria = {
    responseGroup: 'Full',
    memberTypes: ['Contact'],
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
  if (needsPostFilter) {
    // When post-filtering, fetch from the beginning and let the service handle pagination
    criteria.skip = 0;
    criteria.take = Math.max(pageSize + (input.skip ?? 0), 100);
  } else {
    criteria.skip = input.skip ?? 0;
    criteria.take = pageSize;
  }

  return criteria;
}
