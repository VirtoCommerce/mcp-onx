/**
 * Search-related models for VirtoCommerce
 * Based on VirtoCommerce.Platform.Core and module-specific search models
 */

import type { CustomerOrder } from './order.js';
import type { Member, Contact, Organization, Employee, Vendor } from './customer.js';

/**
 * Base search criteria
 */
export interface SearchCriteriaBase {
  responseGroup?: string;
  objectType?: string;
  objectTypes?: string[];
  objectIds?: string[];
  keyword?: string;
  searchPhrase?: string;
  languageCode?: string;
  sort?: string;
  skip?: number;
  take?: number;
}

/**
 * Generic search result
 */
export interface SearchResult<T> {
  totalCount?: number;
  results?: T[];
}

/**
 * Customer order search criteria
 */
export interface CustomerOrderSearchCriteria extends SearchCriteriaBase {
  ids?: string[];
  outerIds?: string[];
  number?: string;
  numbers?: string[];
  status?: string;
  statuses?: string[];
  storeIds?: string[];
  customerId?: string;
  customerIds?: string[];
  employeeId?: string;
  employeeIds?: string[];
  organizationId?: string;
  organizationIds?: string[];
  startDate?: string;
  endDate?: string;
  isPrototype?: boolean;
  subscriptionIds?: string[];
  withPrototypes?: boolean;
  onlyRecurring?: boolean;
  operationId?: string;
}

/**
 * Customer order search result
 */
export type CustomerOrderSearchResult = SearchResult<CustomerOrder>;

/**
 * Member search criteria
 */
export interface MemberSearchCriteria extends SearchCriteriaBase {
  memberId?: string;
  memberIds?: string[];
  memberType?: string;
  memberTypes?: string[];
  group?: string;
  groups?: string[];
  deepSearch?: boolean;
  outerIds?: string[];
}

/**
 * Member search result
 */
export type MemberSearchResult = SearchResult<Member>;

/**
 * Contact search criteria
 */
export interface ContactSearchCriteria extends MemberSearchCriteria {
  organizationId?: string;
  organizationIds?: string[];
}

/**
 * Contact search result
 */
export type ContactSearchResult = SearchResult<Contact>;

/**
 * Organization search criteria
 */
export interface OrganizationSearchCriteria extends MemberSearchCriteria {
  parentOrganizationId?: string;
}

/**
 * Organization search result
 */
export type OrganizationSearchResult = SearchResult<Organization>;

/**
 * Employee search criteria
 */
export interface EmployeeSearchCriteria extends MemberSearchCriteria {
  organizationId?: string;
}

/**
 * Employee search result
 */
export type EmployeeSearchResult = SearchResult<Employee>;

/**
 * Vendor search criteria
 */
export interface VendorSearchCriteria extends MemberSearchCriteria {
  vendorGroupName?: string;
}

/**
 * Vendor search result
 */
export type VendorSearchResult = SearchResult<Vendor>;

/**
 * Payment search criteria
 */
export interface PaymentSearchCriteria extends SearchCriteriaBase {
  orderNumber?: string;
  orderNumbers?: string[];
  orderId?: string;
  orderIds?: string[];
  status?: string;
  statuses?: string[];
  customerId?: string;
  customerIds?: string[];
  storeIds?: string[];
  startDate?: string;
  endDate?: string;
  capturedStartDate?: string;
  capturedEndDate?: string;
  authorizedStartDate?: string;
  authorizedEndDate?: string;
}

/**
 * Shipment search criteria
 */
export interface ShipmentSearchCriteria extends SearchCriteriaBase {
  // From OrderOperationSearchCriteriaBase
  ids?: string[];
  outerIds?: string[];
  hasParentOperation?: boolean;
  parentOperationId?: string;
  numbers?: string[];
  number?: string;
  // ShipmentSearchCriteria own fields
  orderId?: string;
  orderNumber?: string;
  status?: string;
  statuses?: string[];
  storeIds?: string[];
  fulfillmentCenterId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  shipmentMethodCode?: string;
  shipmentMethodOption?: string;
  withShippingMethod?: boolean;
}

/**
 * Indexed search criteria for advanced search
 */
export interface IndexedSearchCriteria extends SearchCriteriaBase {
  rawQuery?: string;
  isFuzzySearch?: boolean;
  fuzzy?: boolean;
  fuzziness?: number;
  includeAggregations?: boolean;
  aggregations?: string[];
  userGroups?: string[];
}

/**
 * Aggregation item
 */
export interface AggregationItem {
  value?: unknown;
  count?: number;
  isApplied?: boolean;
  label?: string;
  labels?: Record<string, string>;
  lowerBound?: number;
  upperBound?: number;
  includesLower?: boolean;
  includesUpper?: boolean;
}

/**
 * Aggregation
 */
export interface Aggregation {
  aggregationType?: string;
  field?: string;
  label?: string;
  labels?: Record<string, string>;
  items?: AggregationItem[];
}

/**
 * Indexed search result
 */
export interface IndexedSearchResult<T> extends SearchResult<T> {
  aggregations?: Aggregation[];
}
