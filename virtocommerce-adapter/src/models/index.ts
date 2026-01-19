/**
 * VirtoCommerce Models
 *
 * TypeScript models based on VirtoCommerce's .NET domain models from:
 * - VirtoCommerce.OrdersModule.Core.Model
 * - VirtoCommerce.CustomerModule.Core.Model
 * - VirtoCommerce.Platform.Core.Common
 */

// Base types
export type {
  Entity,
  AuditableEntity,
  Address,
  AddressType,
  DynamicObjectProperty,
  DynamicPropertyObjectValue,
  Discount,
  TaxDetail,
  FeeDetail,
  SeoInfo,
  Note,
  OperationLog,
  HasDimension,
  SupportsCancellation,
  HasOuterId,
  Taxable,
  HasDiscounts,
  HasTaxDetalization,
  HasFeesDetalization,
} from './base.js';

// Order models
export type {
  CancelledState,
  OrderOperation,
  CustomerOrder,
  ConfigurationItem,
  ConfigurationItemFile,
  LineItem,
  CustomerOrderResponseGroup,
  DashboardStatisticsResult,
  QuarterPeriodMoney,
  OrderOperationStatusChangedEntry,
} from './order.js';

// Shipment models
export type {
  ShippingMethod,
  Shipment,
  CustomerOrderRef,
  ShipmentItem,
  ShipmentPackage,
  FulfillmentCenter,
  ShipmentStatus,
} from './shipment.js';

// Payment models
export type {
  PaymentStatus,
  RefundStatus,
  CaptureStatus,
  RefundReasonCode,
  PaymentMethod,
  PaymentGatewayTransaction,
  ProcessPaymentRequestResult,
  PaymentIn,
  RefundItem,
  RefundLineItemRef,
  Refund,
  CaptureItem,
  CaptureLineItemRef,
  Capture,
  RefundOrderPaymentRequest,
  RefundOrderPaymentResult,
  CaptureOrderPaymentRequest,
  CaptureOrderPaymentResult,
  PaymentCallbackParameters,
} from './payment.js';

// Customer models
export type {
  MemberType,
  Member,
  ApplicationUser,
  Role,
  Permission,
  PermissionScope,
  Contact,
  Organization,
  Employee,
  Vendor,
  CustomerPreference,
  CustomerRole,
  MemberResponseGroup,
  InviteCustomerRequest,
  InviteCustomerResult,
  InviteCustomerError,
  RelationType,
} from './customer.js';

// Search models
export type {
  SearchCriteriaBase,
  SearchResult,
  CustomerOrderSearchCriteria,
  CustomerOrderSearchResult,
  MemberSearchCriteria,
  MemberSearchResult,
  ContactSearchCriteria,
  ContactSearchResult,
  OrganizationSearchCriteria,
  OrganizationSearchResult,
  EmployeeSearchCriteria,
  EmployeeSearchResult,
  VendorSearchCriteria,
  VendorSearchResult,
  PaymentSearchCriteria,
  ShipmentSearchCriteria,
  IndexedSearchCriteria,
  AggregationItem,
  Aggregation,
  IndexedSearchResult,
} from './search.js';
