/**
 * Base types for VirtoCommerce models
 * Based on VirtoCommerce.Platform.Core and module-specific base classes
 */

/**
 * Base entity with ID
 */
export interface Entity {
  id?: string;
}

/**
 * Auditable entity with tracking fields
 */
export interface AuditableEntity extends Entity {
  createdDate?: string;
  modifiedDate?: string;
  createdBy?: string;
  modifiedBy?: string;
}

/**
 * Address model - shared across orders and customers
 */
export interface Address {
  addressType?: AddressType;
  key?: string;
  name?: string;
  organization?: string;
  countryCode?: string;
  countryName?: string;
  city?: string;
  postalCode?: string;
  zip?: string;
  line1?: string;
  line2?: string;
  regionId?: string;
  regionName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  outerId?: string;
  description?: string;
}

export type AddressType = 'Billing' | 'Shipping' | 'BillingAndShipping' | 'Pickup';

/**
 * Dynamic property for extensible metadata
 */
export interface DynamicObjectProperty {
  id?: string;
  name?: string;
  objectId?: string;
  objectType?: string;
  valueType?: string;
  values?: DynamicPropertyObjectValue[];
}

export interface DynamicPropertyObjectValue {
  valueType?: string;
  value?: unknown;
  locale?: string;
  propertyId?: string;
  propertyName?: string;
}

/**
 * Discount information
 */
export interface Discount {
  id?: string;
  promotionId?: string;
  currency?: string;
  discountAmount?: number;
  discountAmountWithTax?: number;
  coupon?: string;
  description?: string;
}

/**
 * Tax detail breakdown
 */
export interface TaxDetail {
  rate?: number;
  amount?: number;
  name?: string;
}

/**
 * Fee detail breakdown
 */
export interface FeeDetail {
  feeId?: string;
  currency?: string;
  amount?: number;
  description?: string;
}

/**
 * SEO information
 */
export interface SeoInfo {
  id?: string;
  name?: string;
  semanticUrl?: string;
  pageTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  storeId?: string;
  objectId?: string;
  objectType?: string;
  isActive?: boolean;
  languageCode?: string;
}

/**
 * Note/comment attached to an entity
 */
export interface Note {
  id?: string;
  title?: string;
  body?: string;
  outerId?: string;
  createdDate?: string;
  modifiedDate?: string;
  createdBy?: string;
  modifiedBy?: string;
}

/**
 * Operation log entry for change tracking
 */
export interface OperationLog {
  id?: string;
  objectType?: string;
  objectId?: string;
  operationType?: string;
  detail?: string;
  createdDate?: string;
  modifiedDate?: string;
  createdBy?: string;
  modifiedBy?: string;
}

/**
 * Interface for entities with dimensions
 */
export interface HasDimension {
  weightUnit?: string;
  weight?: number;
  measureUnit?: string;
  height?: number;
  length?: number;
  width?: number;
}

export type CancelledState = 'Undefined' | 'Requested' | 'Completed';

/**
 * Interface for cancellable entities
 */
export interface SupportsCancellation {
  isCancelled?: boolean;
  cancelledDate?: string;
  cancelReason?: string;
  cancelledState?: CancelledState;
}

/**
 * Interface for entities with outer ID (external system reference)
 */
export interface HasOuterId {
  outerId?: string;
}

/**
 * Interface for taxable entities
 */
export interface Taxable {
  taxType?: string;
  taxTotal?: number;
  taxPercentRate?: number;
}

/**
 * Interface for entities with discounts
 */
export interface HasDiscounts {
  discounts?: Discount[];
}

/**
 * Interface for entities with tax details
 */
export interface HasTaxDetalization {
  taxDetails?: TaxDetail[];
}

/**
 * Interface for entities with fee details
 */
export interface HasFeesDetalization {
  feeDetails?: FeeDetail[];
}
