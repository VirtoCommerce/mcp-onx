/**
 * Customer-related models for VirtoCommerce
 * Based on VirtoCommerce.CustomerModule.Core.Model
 */

import type {
  AuditableEntity,
  Address,
  Note,
  DynamicObjectProperty,
  SeoInfo,
  HasOuterId,
} from './base.js';

/**
 * Member type discriminator
 */
export type MemberType = 'Contact' | 'Organization' | 'Employee' | 'Vendor';

/**
 * Base member class - abstract base for all customer types
 */
export interface Member extends AuditableEntity, HasOuterId {
  name?: string;
  memberType?: MemberType;
  status?: string;
  addresses?: Address[];
  phones?: string[];
  emails?: string[];
  notes?: Note[];
  groups?: string[];
  iconUrl?: string;
  relevanceScore?: number;
  objectType?: string;
  dynamicProperties?: DynamicObjectProperty[];
  seoObjectType?: string;
  seoInfos?: SeoInfo[];
}

/**
 * Application user - security account
 */
export interface ApplicationUser {
  id?: string;
  userName?: string;
  email?: string;
  emailConfirmed?: boolean;
  phoneNumber?: string;
  phoneNumberConfirmed?: boolean;
  isAdministrator?: boolean;
  lockoutEnabled?: boolean;
  lockoutEnd?: string;
  accessFailedCount?: number;
  twoFactorEnabled?: boolean;
  passwordExpired?: boolean;
  lastPasswordChangedDate?: string;
  memberId?: string;
  storeId?: string;
  userType?: string;
  status?: string;
  roles?: Role[];
  permissions?: string[];
}

/**
 * User role
 */
export interface Role {
  id?: string;
  name?: string;
  description?: string;
  permissions?: Permission[];
}

/**
 * Permission
 */
export interface Permission {
  id?: string;
  name?: string;
  moduleId?: string;
  groupName?: string;
  assignedScopes?: PermissionScope[];
}

/**
 * Permission scope
 */
export interface PermissionScope {
  type?: string;
  label?: string;
  scope?: string;
}

/**
 * Contact - represents an individual customer
 */
export interface Contact extends Member {
  memberType?: 'Contact';

  // Name components
  salutation?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;

  // Personal info
  birthDate?: string;
  defaultLanguage?: string;
  currencyCode?: string;
  timeZone?: string;
  about?: string;
  photoUrl?: string;
  isAnonymized?: boolean;

  // Tax
  taxPayerId?: string;

  // Organizations
  organizations?: string[];
  associatedOrganizations?: string[];
  defaultOrganizationId?: string;
  currentOrganizationId?: string;

  // Preferences
  preferredDelivery?: string;
  preferredCommunication?: string;
  defaultShippingAddressId?: string;
  defaultBillingAddressId?: string;

  // Security
  securityAccounts?: ApplicationUser[];
}

/**
 * Organization - represents a business/company customer
 */
export interface Organization extends Member {
  memberType?: 'Organization';
  description?: string;
  businessCategory?: string;
  ownerId?: string;
  parentId?: string;
}

/**
 * Employee - represents an employee/staff member
 */
export interface Employee extends Member {
  memberType?: 'Employee';

  // Name components
  salutation?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;

  // Personal info
  birthDate?: string;
  defaultLanguage?: string;
  timeZone?: string;
  photoUrl?: string;

  // Organizations
  organizations?: string[];

  // Security
  securityAccounts?: ApplicationUser[];
}

/**
 * Vendor - represents a vendor/supplier
 */
export interface Vendor extends Member {
  memberType?: 'Vendor';
  description?: string;
  siteUrl?: string;
  logoUrl?: string;
  groupName?: string;
}

/**
 * Customer preference
 */
export interface CustomerPreference extends AuditableEntity {
  customerId?: string;
  name?: string;
  value?: string;
}

/**
 * Customer role
 */
export interface CustomerRole {
  id?: string;
  name?: string;
  description?: string;
}

/**
 * Member response group for controlling data loading
 */
export type MemberResponseGroup =
  | 'None'
  | 'WithAddresses'
  | 'WithNotes'
  | 'WithEmails'
  | 'WithPhones'
  | 'WithGroups'
  | 'WithSecurityAccounts'
  | 'WithSeo'
  | 'WithDynamicProperties'
  | 'Full';

/**
 * Invite customer request
 */
export interface InviteCustomerRequest {
  storeId?: string;
  organizationId?: string;
  email?: string;
  urlSuffix?: string;
  language?: string;
  message?: string;
  roles?: string[];
  customerOrderId?: string;
}

/**
 * Invite customer result
 */
export interface InviteCustomerResult {
  succeeded?: boolean;
  errors?: InviteCustomerError[];
  customerId?: string;
}

/**
 * Invite customer error
 */
export interface InviteCustomerError {
  code?: string;
  description?: string;
  parameter?: string;
}

/**
 * Relation type between members
 */
export interface RelationType {
  id?: string;
  sourceId?: string;
  targetId?: string;
  relationTypeName?: string;
}
