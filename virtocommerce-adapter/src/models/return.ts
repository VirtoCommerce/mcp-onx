/**
 * VirtoCommerce Return Module models
 * Based on vc-module-return C# domain models (JSON camelCase)
 */

import type { AuditableEntity } from './base.js';
import type { CustomerOrder } from './order.js';

/**
 * VirtoCommerce Return entity
 */
export interface VcReturn extends AuditableEntity {
  number?: string;
  orderId?: string;
  status?: string;
  resolution?: string;
  order?: CustomerOrder;
  lineItems?: VcReturnLineItem[];
}

/**
 * VirtoCommerce Return line item
 */
export interface VcReturnLineItem extends AuditableEntity {
  returnId?: string;
  orderLineItemId?: string;
  quantity?: number;
  availableQuantity?: number;
  price?: number;
  reason?: string;
}

/**
 * Search criteria for VirtoCommerce Return search endpoint
 */
export interface ReturnSearchCriteria {
  orderId?: string;
  objectIds?: string[];
  keyword?: string;
  skip?: number;
  take?: number;
  sort?: string;
}

/**
 * Search result from VirtoCommerce Return search endpoint
 */
export interface ReturnSearchResult {
  totalCount?: number;
  results?: VcReturn[];
}
