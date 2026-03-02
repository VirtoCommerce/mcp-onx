/**
 * Shipment-related models for VirtoCommerce
 * Based on VirtoCommerce.OrdersModule.Core.Model
 */

import type {
  AuditableEntity,
  Address,
  HasDimension,
  SupportsCancellation,
  HasOuterId,
  Taxable,
  HasDiscounts,
  HasTaxDetalization,
  HasFeesDetalization,
} from './base.js';
import type { OrderOperation, LineItem } from './order.js';
import type { PaymentIn } from './payment.js';

/**
 * Shipping method information
 */
export interface ShippingMethod {
  code?: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  taxType?: string;
  isActive?: boolean;
  priority?: number;
  storeId?: string;
}

/**
 * Shipment - represents a fulfillment/delivery
 */
export interface Shipment
  extends OrderOperation,
    HasTaxDetalization,
    SupportsCancellation,
    Taxable,
    HasDiscounts,
    HasFeesDetalization,
    HasDimension {
  // Organization/Fulfillment info
  organizationId?: string;
  organizationName?: string;
  fulfillmentCenterId?: string;
  fulfillmentCenterName?: string;
  employeeId?: string;
  employeeName?: string;
  vendorId?: string;

  // Shipping method
  shipmentMethodCode?: string;
  shipmentMethodOption?: string;
  shippingMethod?: ShippingMethod;

  // Parent order reference
  customerOrderId?: string;
  customerOrder?: CustomerOrderRef;

  // Collections
  items?: ShipmentItem[];
  packages?: ShipmentPackage[];
  inPayments?: PaymentIn[];

  // Address
  deliveryAddress?: Address;
  pickupLocationId?: string;

  // Pricing
  price?: number;
  priceWithTax?: number;
  total?: number;
  totalWithTax?: number;
  discountAmount?: number;
  discountAmountWithTax?: number;
  fee?: number;
  feeWithTax?: number;

  // Tracking
  trackingNumber?: string;
  trackingUrl?: string;
  deliveryDate?: string;

  // Object type
  objectType?: string;
}

/**
 * Reference to parent customer order (to avoid circular dependency)
 */
export interface CustomerOrderRef {
  id?: string;
  number?: string;
}

/**
 * Item within a shipment
 */
export interface ShipmentItem extends AuditableEntity, HasOuterId {
  lineItemId?: string;
  lineItem?: LineItem;
  barCode?: string;
  quantity?: number;
  status?: string;
}

/**
 * Package within a shipment
 */
export interface ShipmentPackage extends AuditableEntity, HasDimension {
  barCode?: string;
  packageType?: string;
  items?: ShipmentItem[];
}

/**
 * Fulfillment center information
 */
export interface FulfillmentCenter {
  id?: string;
  name?: string;
  description?: string;
  geoLocation?: string;
  address?: Address;
  outerId?: string;
}

/**
 * Shipment status enumeration
 */
export type ShipmentStatus =
  | 'New'
  | 'PickPack'
  | 'ReadyToSend'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'OnHold'
  | 'PartiallyShipped';
