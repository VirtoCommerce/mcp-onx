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
} from '@cof-org/mcp';
import type { CustomerOrderSearchCriteria, MemberSearchCriteria } from '../models/index.js';

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
 * Map GetProductsInput to API query parameters
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
 * Map GetProductVariantsInput to API query parameters
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
    memberTypes: ['Contact'],
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
 * Map GetFulfillmentsInput to API query parameters
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
 * Map GetReturnsInput to API query parameters
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
