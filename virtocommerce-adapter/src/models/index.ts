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
  CancelledState,
  HasOuterId,
  Taxable,
  HasDiscounts,
  HasTaxDetalization,
  HasFeesDetalization,
} from './base.js';

// Order models
export type {
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

// Catalog models
export type {
  CatalogProduct,
  ProductImage,
  ProductAsset,
  ProductProperty,
  ProductPropertyValue,
  PropertyDisplayName,
  CategoryRef,
  EditorialReview,
  ProductAssociation,
  CategoryLink,
  ProductSearchCriteria,
  ProductSearchResult,
  ListEntrySearchCriteria,
  ListEntryBase,
  ListEntrySearchResult,
  PriceEvaluationContext,
  EvaluatedPrice,
} from './catalog.js';

// Inventory models
export type {
  InventoryInfo,
  InventoryStatus,
  InventorySearchCriteria,
  InventorySearchResult,
  ProductInventoryInfo,
} from './inventory.js';

// Return models
export type {
  VcReturn,
  VcReturnLineItem,
  ReturnSearchCriteria,
  ReturnSearchResult,
} from './return.js';

// Store models
export type { Store } from './store.js';

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
