/**
 * Order-related models for VirtoCommerce
 * Based on VirtoCommerce.OrdersModule.Core.Model
 */

import type {
  AuditableEntity,
  Address,
  DynamicObjectProperty,
  OperationLog,
  HasDimension,
  SupportsCancellation,
  HasOuterId,
  Taxable,
  HasDiscounts,
  HasTaxDetalization,
  HasFeesDetalization,
} from './base.js';
import type { PaymentIn } from './payment.js';
import type { Shipment } from './shipment.js';

/**
 * Base class for all order operations (orders, shipments, payments)
 */
export interface OrderOperation extends AuditableEntity, HasOuterId, SupportsCancellation {
  operationType?: string;
  parentOperationId?: string;
  number?: string;
  isApproved?: boolean;
  status?: string;
  comment?: string;
  currency?: string;
  sum?: number;
  objectType?: string;
  dynamicProperties?: DynamicObjectProperty[];
  operationsLog?: OperationLog[];
}

/**
 * Customer order - main order entity
 */
export interface CustomerOrder extends OrderOperation, HasTaxDetalization, Taxable, HasDiscounts, HasFeesDetalization {
  customerId?: string;
  customerName?: string;
  channelId?: string;
  storeId?: string;
  storeName?: string;
  organizationId?: string;
  organizationName?: string;
  employeeId?: string;
  employeeName?: string;
  shoppingCartId?: string;
  isPrototype?: boolean;
  purchaseOrderNumber?: string;
  subscriptionNumber?: string;
  subscriptionId?: string;
  languageCode?: string;
  isAnonymous?: boolean;

  // Collections
  addresses?: Address[];
  inPayments?: PaymentIn[];
  items?: LineItem[];
  shipments?: Shipment[];

  // Totals
  total?: number;
  subTotal?: number;
  subTotalWithTax?: number;
  subTotalDiscount?: number;
  subTotalDiscountWithTax?: number;
  subTotalTaxTotal?: number;

  // Shipping totals
  shippingTotal?: number;
  shippingTotalWithTax?: number;
  shippingSubTotal?: number;
  shippingSubTotalWithTax?: number;
  shippingDiscountTotal?: number;
  shippingDiscountTotalWithTax?: number;
  shippingTaxTotal?: number;

  // Payment totals
  paymentTotal?: number;
  paymentTotalWithTax?: number;
  paymentSubTotal?: number;
  paymentSubTotalWithTax?: number;
  paymentDiscountTotal?: number;
  paymentDiscountTotalWithTax?: number;
  paymentTaxTotal?: number;

  // Discount totals
  discountAmount?: number;
  discountTotal?: number;
  discountTotalWithTax?: number;

  // Fee totals
  fee?: number;
  feeWithTax?: number;
  feeTotal?: number;
  feeTotalWithTax?: number;

  // Handling
  handlingTotal?: number;
  handlingTotalWithTax?: number;

  // Security
  scopes?: string[];
}

/**
 * Configuration item for configurable products
 */
export interface ConfigurationItem {
  id?: string;
  productId?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  imageUrl?: string;
  sectionId?: string;
  sectionName?: string;
  currency?: string;
  listPrice?: number;
  listPriceWithTax?: number;
  salePrice?: number;
  salePriceWithTax?: number;
  files?: ConfigurationItemFile[];
}

export interface ConfigurationItemFile {
  id?: string;
  url?: string;
  name?: string;
  size?: number;
  contentType?: string;
}

/**
 * Line item in an order
 */
export interface LineItem
  extends AuditableEntity,
    HasOuterId,
    HasTaxDetalization,
    SupportsCancellation,
    HasDimension,
    Taxable,
    HasDiscounts,
    HasFeesDetalization {
  // Product info
  productId?: string;
  sku?: string;
  productType?: string;
  catalogId?: string;
  categoryId?: string;
  name?: string;
  productOuterId?: string;
  vendorId?: string;
  imageUrl?: string;
  comment?: string;
  status?: string;

  // Quantity
  quantity?: number;
  reserveQuantity?: number;

  // Pricing
  priceId?: string;
  currency?: string;
  price?: number;
  priceWithTax?: number;
  listTotal?: number;
  listTotalWithTax?: number;
  placedPrice?: number;
  placedPriceWithTax?: number;
  extendedPrice?: number;
  extendedPriceWithTax?: number;

  // Discounts
  discountAmount?: number;
  isDiscountAmountRounded?: boolean;
  discountAmountWithTax?: number;
  discountTotal?: number;
  discountTotalWithTax?: number;

  // Fees
  fee?: number;
  feeWithTax?: number;

  // Flags
  isGift?: boolean;
  isConfigured?: boolean;

  // Fulfillment
  shippingMethodCode?: string;
  fulfillmentLocationCode?: string;
  fulfillmentCenterId?: string;
  fulfillmentCenterName?: string;

  // Dynamic properties
  dynamicProperties?: DynamicObjectProperty[];

  // Configuration
  configurationItems?: ConfigurationItem[];

  // Object type
  objectType?: string;
}

/**
 * Response group for controlling data loading
 */
export type CustomerOrderResponseGroup =
  | 'None'
  | 'WithItems'
  | 'WithInPayments'
  | 'WithShipments'
  | 'WithAddresses'
  | 'WithDiscounts'
  | 'WithDynamicProperties'
  | 'Full';

/**
 * Dashboard statistics result
 */
export interface DashboardStatisticsResult {
  startDate?: string;
  endDate?: string;
  revenue?: number;
  orderCount?: number;
  customersCount?: number;
  avgOrderValue?: number;
  avgOrderValuePeriodDetails?: QuarterPeriodMoney[];
  revenuePeriodDetails?: QuarterPeriodMoney[];
  revenuePerCustomerPeriodDetails?: QuarterPeriodMoney[];
  orderCountPeriodDetails?: QuarterPeriodMoney[];
  orderAveragePeriodDetails?: QuarterPeriodMoney[];
}

export interface QuarterPeriodMoney {
  year?: number;
  quarter?: number;
  amount?: number;
}

/**
 * Order status changed entry for notifications
 */
export interface OrderOperationStatusChangedEntry {
  operationType?: string;
  oldStatus?: string;
  newStatus?: string;
  changedDate?: string;
}
