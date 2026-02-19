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
 * Product search criteria
 */
export interface ProductSearchCriteria {
  responseGroup?: string;
  objectType?: string;
  keyword?: string;
  searchPhrase?: string;
  sort?: string;
  skip?: number;
  take?: number;
  objectIds?: string[];
  catalogIds?: string[];
  categoryIds?: string[];
  codes?: string[];
  skus?: string[];
  productTypes?: string[];
  vendorIds?: string[];
  startDate?: string;
  endDate?: string;
  startDateRange?: string;
  searchInChildren?: boolean;
  searchInVariations?: boolean;
}

/**
 * Product search result
 */
export interface ProductSearchResult {
  totalCount?: number;
  items?: CatalogProduct[];
}
