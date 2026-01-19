/**
 * Payment-related models for VirtoCommerce
 * Based on VirtoCommerce.OrdersModule.Core.Model
 */

import type {
  AuditableEntity,
  Address,
  HasOuterId,
  Taxable,
  HasDiscounts,
  HasTaxDetalization,
  HasFeesDetalization,
} from './base.js';
import type { OrderOperation } from './order.js';

/**
 * Payment status enumeration
 */
export type PaymentStatus =
  | 'New'
  | 'Pending'
  | 'Authorized'
  | 'Paid'
  | 'PartiallyRefunded'
  | 'Refunded'
  | 'Voided'
  | 'Custom'
  | 'Cancelled'
  | 'Declined'
  | 'Error';

/**
 * Refund status enumeration
 */
export type RefundStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Processed';

/**
 * Capture status enumeration
 */
export type CaptureStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Processed';

/**
 * Refund reason codes
 */
export type RefundReasonCode =
  | 'CustomerRequest'
  | 'Duplicate'
  | 'Fraudulent'
  | 'RequestedByCustomer'
  | 'Other';

/**
 * Payment method information
 */
export interface PaymentMethod {
  code?: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  isAvailableForPartial?: boolean;
  priority?: number;
  isActive?: boolean;
  storeId?: string;
  taxType?: string;
  paymentMethodType?: number;
  paymentMethodGroupType?: number;
}

/**
 * Payment gateway transaction
 */
export interface PaymentGatewayTransaction extends AuditableEntity {
  amount?: number;
  currency?: string;
  isProcessed?: boolean;
  processedDate?: string;
  processError?: string;
  processAttemptCount?: number;
  requestData?: string;
  responseData?: string;
  responseCode?: string;
  gatewayIpAddress?: string;
  type?: string;
  status?: string;
  note?: string;
}

/**
 * Process payment request result
 */
export interface ProcessPaymentRequestResult {
  isSuccess?: boolean;
  errorMessage?: string;
  redirectUrl?: string;
  htmlForm?: string;
  outerId?: string;
  newPaymentStatus?: PaymentStatus;
}

/**
 * Payment in - incoming payment for an order
 */
export interface PaymentIn
  extends OrderOperation,
    HasTaxDetalization,
    Taxable,
    HasDiscounts,
    HasFeesDetalization {
  orderId?: string;
  purpose?: string;
  gatewayCode?: string;
  paymentMethod?: PaymentMethod;
  vendorId?: string;

  // Organization info
  organizationId?: string;
  organizationName?: string;

  // Customer info
  customerId?: string;
  customerName?: string;

  // Dates
  incomingDate?: string;
  authorizedDate?: string;
  capturedDate?: string;
  voidedDate?: string;

  // Status
  paymentStatus?: PaymentStatus;

  // Address
  billingAddress?: Address;

  // Process result
  processPaymentResult?: ProcessPaymentRequestResult;

  // Pricing
  price?: number;
  priceWithTax?: number;
  total?: number;
  totalWithTax?: number;
  discountAmount?: number;
  discountAmountWithTax?: number;

  // Collections
  transactions?: PaymentGatewayTransaction[];
  refunds?: Refund[];
  captures?: Capture[];

  // Object type
  objectType?: string;
}

/**
 * Refund item
 */
export interface RefundItem extends AuditableEntity, HasOuterId {
  lineItemId?: string;
  lineItem?: RefundLineItemRef;
  quantity?: number;
}

/**
 * Reference to line item for refunds
 */
export interface RefundLineItemRef {
  id?: string;
  sku?: string;
  name?: string;
}

/**
 * Refund - represents a refund on a payment
 */
export interface Refund extends OrderOperation {
  amount?: number;
  reasonCode?: RefundReasonCode;
  refundStatus?: RefundStatus;
  reasonMessage?: string;
  rejectReasonMessage?: string;
  vendorId?: string;
  transactionId?: string;
  customerOrderId?: string;
  paymentId?: string;
  items?: RefundItem[];
  objectType?: string;
}

/**
 * Capture item
 */
export interface CaptureItem extends AuditableEntity, HasOuterId {
  lineItemId?: string;
  lineItem?: CaptureLineItemRef;
  quantity?: number;
}

/**
 * Reference to line item for captures
 */
export interface CaptureLineItemRef {
  id?: string;
  sku?: string;
  name?: string;
}

/**
 * Capture - represents a capture of authorized funds
 */
export interface Capture extends OrderOperation {
  amount?: number;
  vendorId?: string;
  transactionId?: string;
  customerOrderId?: string;
  paymentId?: string;
  closeTransaction?: boolean;
  items?: CaptureItem[];
  objectType?: string;
}

/**
 * Refund order payment request
 */
export interface RefundOrderPaymentRequest {
  paymentId?: string;
  orderId?: string;
  amount?: number;
  reasonCode?: RefundReasonCode;
  reasonMessage?: string;
  outerId?: string;
  transactionId?: string;
  items?: RefundItem[];
}

/**
 * Refund order payment result
 */
export interface RefundOrderPaymentResult {
  isSuccess?: boolean;
  errorMessage?: string;
  refund?: Refund;
}

/**
 * Capture order payment request
 */
export interface CaptureOrderPaymentRequest {
  paymentId?: string;
  orderId?: string;
  amount?: number;
  outerId?: string;
  closeTransaction?: boolean;
  items?: CaptureItem[];
}

/**
 * Capture order payment result
 */
export interface CaptureOrderPaymentResult {
  isSuccess?: boolean;
  errorMessage?: string;
  capture?: Capture;
}

/**
 * Payment callback parameters
 */
export interface PaymentCallbackParameters {
  parameters?: Record<string, string>;
}
