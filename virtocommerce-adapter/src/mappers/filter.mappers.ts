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

/**
 * Map GetOrdersInput to API query parameters
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
 * Map GetCustomersInput to API query parameters
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
