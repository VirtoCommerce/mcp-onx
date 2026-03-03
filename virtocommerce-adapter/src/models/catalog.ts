/**
 * Catalog-related models for VirtoCommerce
 * Based on VirtoCommerce.CatalogModule.Core.Model
 */

import type { AuditableEntity, HasOuterId, SeoInfo, DynamicObjectProperty } from './base.js';

/**
 * Catalog product - main product entity
 */
export interface CatalogProduct extends AuditableEntity, HasOuterId {
  code?: string;
  manufacturerPartNumber?: string;
  gtin?: string;
  name?: string;
  catalogId?: string;
  categoryId?: string;
  outline?: string;
  path?: string;
  titularItemId?: string;
  mainProductId?: string;
  isBuyable?: boolean;
  isActive?: boolean;
  trackInventory?: boolean;
  indexingDate?: string;
  maxQuantity?: number;
  minQuantity?: number;
  productType?: string;
  packageType?: string;
  imgSrc?: string;
  vendor?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  enableReview?: boolean;
  maxNumberOfDownload?: number;
  downloadExpiration?: string;
  downloadType?: string;
  hasUserAgreement?: boolean;
  objectType?: string;

  // Dimensions
  weightUnit?: string;
  weight?: number;
  measureUnit?: string;
  height?: number;
  length?: number;
  width?: number;

  // Collections
  images?: ProductImage[];
  assets?: ProductAsset[];
  variations?: CatalogProduct[];
  properties?: ProductProperty[];
  categories?: CategoryRef[];
  seoInfos?: SeoInfo[];
  reviews?: EditorialReview[];
  associations?: ProductAssociation[];
  links?: CategoryLink[];
  dynamicProperties?: DynamicObjectProperty[];

  // Tax
  taxType?: string;
}

/**
 * Product image
 */
export interface ProductImage {
  id?: string;
  name?: string;
  url?: string;
  relativeUrl?: string;
  group?: string;
  sortOrder?: number;
  languageCode?: string;
  description?: string;
  altText?: string;
}

/**
 * Product asset (downloadable file, document, etc.)
 */
export interface ProductAsset {
  id?: string;
  name?: string;
  url?: string;
  relativeUrl?: string;
  mimeType?: string;
  size?: number;
  group?: string;
  sortOrder?: number;
  languageCode?: string;
  description?: string;
}

/**
 * Product property (characteristic)
 */
export interface ProductProperty {
  id?: string;
  catalogId?: string;
  categoryId?: string;
  name?: string;
  required?: boolean;
  dictionary?: boolean;
  multivalue?: boolean;
  multilanguage?: boolean;
  valueType?: string;
  type?: string;
  values?: ProductPropertyValue[];
  displayNames?: PropertyDisplayName[];
}

/**
 * Product property value
 */
export interface ProductPropertyValue {
  id?: string;
  propertyId?: string;
  propertyName?: string;
  valueId?: string;
  value?: unknown;
  valueType?: string;
  languageCode?: string;
  alias?: string;
}

/**
 * Property display name for localization
 */
export interface PropertyDisplayName {
  name?: string;
  languageCode?: string;
}

/**
 * Category reference
 */
export interface CategoryRef {
  id?: string;
  code?: string;
  name?: string;
  path?: string;
  outline?: string;
  isVirtual?: boolean;
}

/**
 * Editorial review (product description)
 */
export interface EditorialReview {
  id?: string;
  content?: string;
  reviewType?: string;
  languageCode?: string;
}

/**
 * Product association
 */
export interface ProductAssociation {
  type?: string;
  priority?: number;
  quantity?: number;
  associatedObjectId?: string;
  associatedObjectType?: string;
  tags?: string[];
}

/**
 * Category link
 */
export interface CategoryLink {
  catalogId?: string;
  categoryId?: string;
}

/**
 * Product indexed search criteria.
 *
 * Matches VirtoCommerce's ProductIndexedSearchCriteria which inherits from
 * CatalogIndexedSearchCriteria → SearchCriteriaBase.
 *
 * Used by POST /api/catalog/search/products (Elastic Search).
 * Note: `codes` / `skus` fields do NOT exist on the indexed search criteria;
 * SKU resolution must happen via /api/catalog/listentries first.
 */
export interface ProductSearchCriteria {
  // SearchCriteriaBase
  responseGroup?: string;
  objectType?: string;
  objectIds?: string[];
  keyword?: string;
  searchPhrase?: string;
  sort?: string;
  skip?: number;
  take?: number;

  // CatalogIndexedSearchCriteria
  storeId?: string;
  catalogId?: string;
  catalogIds?: string[];
  outline?: string;
  outlines?: string[];
  terms?: string[];
  searchInChildren?: boolean;
  searchInVariations?: boolean;

  // ProductIndexedSearchCriteria
  currency?: string;
  pricelists?: string[];
  withHidden?: boolean;
}

/**
 * Product search result
 */
export interface ProductSearchResult {
  totalCount?: number;
  items?: CatalogProduct[];
}

/**
 * List entry search criteria for /api/catalog/listentries
 */
export interface ListEntrySearchCriteria {
  keyword?: string;
  catalogId?: string;
  catalogIds?: string[];
  categoryId?: string;
  categoryIds?: string[];
  searchInChildren?: boolean;
  searchInVariations?: boolean;
  withHidden?: boolean;
  responseGroup?: string;
  objectIds?: string[];
  skip?: number;
  take?: number;
}

/**
 * List entry base - returned by /api/catalog/listentries
 */
export interface ListEntryBase {
  id?: string;
  type?: string;
  code?: string;
  name?: string;
  imageUrl?: string;
  isActive?: boolean;
  catalogId?: string;
}

/**
 * List entry search result
 */
export interface ListEntrySearchResult {
  totalCount?: number;
  results?: ListEntryBase[];
  listEntries?: ListEntryBase[];
}

/**
 * Context for evaluating product prices via /api/pricing/evaluate
 */
export interface PriceEvaluationContext {
  storeId?: string;
  catalogId?: string;
  productIds?: string[];
  currency?: string;
  customerId?: string;
  quantity?: number;
}

/**
 * Evaluated price returned by the Pricing module
 */
export interface EvaluatedPrice {
  productId?: string;
  list?: number;
  sale?: number | null;
  currency?: string;
  minQuantity?: number;
}
