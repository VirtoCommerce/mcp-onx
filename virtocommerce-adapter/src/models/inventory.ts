/**
 * Inventory-related models for VirtoCommerce
 * Based on VirtoCommerce.InventoryModule.Core.Model
 */

import type { AuditableEntity, HasOuterId } from './base.js';

/**
 * Inventory info - stock record for a product at a fulfillment center
 */
export interface InventoryInfo extends AuditableEntity, HasOuterId {
  productId?: string;
  fulfillmentCenterId?: string;
  fulfillmentCenterName?: string;
  inStockQuantity?: number;
  reservedQuantity?: number;
  reorderMinQuantity?: number;
  preorderQuantity?: number;
  backorderQuantity?: number;
  allowBackorder?: boolean;
  allowPreorder?: boolean;
  status?: InventoryStatus;
  preorderAvailabilityDate?: string;
  backorderAvailabilityDate?: string;
}

/**
 * Inventory status
 */
export type InventoryStatus = 'Enabled' | 'Disabled' | 'Tracked' | 'Ignored';

/**
 * Inventory search criteria
 */
export interface InventorySearchCriteria {
  productIds?: string[];
  fulfillmentCenterIds?: string[];
  keyword?: string;
  skip?: number;
  take?: number;
  responseGroup?: string;
}

/**
 * Inventory search result
 */
export interface InventorySearchResult {
  totalCount?: number;
  results?: InventoryInfo[];
}

/**
 * Product inventory info - inventory grouped by product
 */
export interface ProductInventoryInfo {
  productId?: string;
  inventoryInfos?: InventoryInfo[];
}
