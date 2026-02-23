/**
 * Product service - handles product, variant, and inventory operations
 */

import type {
  Product,
  ProductVariant,
  InventoryItem,
  FulfillmentToolResult,
  GetProductsInput,
  GetProductVariantsInput,
  GetInventoryInput,
} from '@cof-org/mcp';
import type {
  ProductSearchResult,
  InventorySearchResult,
  InventorySearchCriteria,
  ListEntrySearchResult,
  ListEntrySearchCriteria,
} from '../models/index.js';
import { BaseService } from './base.service.js';
import { ProductTransformer } from '../transformers/product.transformer.js';
import {
  mapProductFiltersToSearchCriteria,
  mapProductVariantFiltersToSearchCriteria,
} from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class ProductService extends BaseService {
  private transformer: ProductTransformer;
  private catalogId?: string;

  constructor(client: ApiClient, tenantId: string = 'default-workspace') {
    super(client);
    this.transformer = new ProductTransformer(tenantId);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  setCatalogId(catalogId: string): void {
    this.catalogId = catalogId;
  }

  async getProducts(input: GetProductsInput): Promise<FulfillmentToolResult<{ products: Product[] }>> {
    try {
      // Use products-by-codes endpoint for SKU search when catalogId is available
      if (input.skus?.length && this.catalogId) {
        return this.getProductsByCodes(input.skus);
      }

      const searchCriteria = mapProductFiltersToSearchCriteria(input);

      const response = await this.client.post<ProductSearchResult>(
        '/api/catalog/search/products',
        searchCriteria
      );

      if (!response.success) {
        return this.failure<{ products: Product[] }>(
          'Failed to fetch products',
          response.error ?? response
        );
      }

      const results = response.data?.items ?? [];
      const products = this.transformer.fromCatalogProducts(results);
      return this.success<{ products: Product[] }>({ products });
    } catch (error: unknown) {
      return this.failure<{ products: Product[] }>(
        `Product lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  private async getProductsByCodes(skus: string[]): Promise<FulfillmentToolResult<{ products: Product[] }>> {
    // Step 1: Resolve SKUs to product IDs via listentries
    const productIds = await this.resolveSkusToIds(skus);

    if (!productIds.length) {
      return this.success<{ products: Product[] }>({ products: [] });
    }

    // Step 2: Fetch full products by IDs
    const response = await this.client.post<ProductSearchResult>(
      '/api/catalog/search/products',
      {
        objectIds: productIds,
        responseGroup: 'ItemInfo,ItemAssets,ItemProperties,Links,Variations,Seo',
        take: productIds.length,
      }
    );

    if (!response.success) {
      return this.failure<{ products: Product[] }>(
        'Failed to fetch products by codes',
        response.error ?? response
      );
    }

    const results = response.data?.items ?? [];
    const products = this.transformer.fromCatalogProducts(results);
    return this.success<{ products: Product[] }>({ products });
  }

  /**
   * Resolve SKU codes to product IDs via /api/catalog/listentries
   */
  private async resolveSkusToIds(skus: string[]): Promise<string[]> {
    const criteria: ListEntrySearchCriteria = {
      keyword: `code:${skus.join(',')}`,
      catalogId: this.catalogId,
      searchInVariations: true,
      take: skus.length,
    };

    const response = await this.client.post<ListEntrySearchResult>(
      '/api/catalog/listentries',
      criteria
    );

    if (!response.success || !response.data) {
      return [];
    }

    const entries = response.data.results ?? response.data.listEntries ?? [];
    return entries
      .filter((entry) => entry.id && entry.type?.toLowerCase() === 'product')
      .map((entry) => entry.id!);
  }

  async getProductVariants(
    input: GetProductVariantsInput
  ): Promise<FulfillmentToolResult<{ productVariants: ProductVariant[] }>> {
    try {
      const searchCriteria = mapProductVariantFiltersToSearchCriteria(input);

      const response = await this.client.post<ProductSearchResult>(
        '/api/catalog/search/products',
        searchCriteria
      );

      if (!response.success) {
        return this.failure<{ productVariants: ProductVariant[] }>(
          'Failed to fetch product variants',
          response.error ?? response
        );
      }

      const results = response.data?.items ?? [];
      const productVariants = this.transformer.fromCatalogProductVariants(results);
      return this.success<{ productVariants: ProductVariant[] }>({ productVariants });
    } catch (error: unknown) {
      return this.failure<{ productVariants: ProductVariant[] }>(
        `Product variant lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  async getInventory(
    input: GetInventoryInput
  ): Promise<FulfillmentToolResult<{ inventory: InventoryItem[] }>> {
    try {
      // Step 1: Resolve SKUs to product IDs via listentries, then fetch product details
      const resolvedIds = this.catalogId
        ? await this.resolveSkusToIds(input.skus)
        : [];

      if (!resolvedIds.length) {
        return this.success<{ inventory: InventoryItem[] }>({ inventory: [] });
      }

      // Fetch product details to build SKU map
      const catalogResponse = await this.client.post<ProductSearchResult>(
        '/api/catalog/search/products',
        {
          objectIds: resolvedIds,
          responseGroup: 'ItemInfo',
          take: resolvedIds.length,
        }
      );

      const products = catalogResponse.success ? (catalogResponse.data?.items ?? []) : [];

      // Build SKU map: productId → SKU code
      const skuMap = new Map<string, string>();
      for (const product of products) {
        if (product.id && product.code) {
          skuMap.set(product.id, product.code);
        }
      }

      // Step 2: Query inventory for resolved product IDs
      const inventoryCriteria: InventorySearchCriteria = {
        productIds: resolvedIds,
        take: resolvedIds.length * 10, // Allow multiple locations per product
      };

      if (input.locationIds?.length) {
        inventoryCriteria.fulfillmentCenterIds = input.locationIds;
      }

      const inventoryResponse = await this.client.post<InventorySearchResult>(
        '/api/inventory/search',
        inventoryCriteria
      );

      if (!inventoryResponse.success) {
        return this.failure<{ inventory: InventoryItem[] }>(
          'Failed to fetch inventory',
          inventoryResponse.error ?? inventoryResponse
        );
      }

      const inventoryRecords = inventoryResponse.data?.results ?? [];
      const inventory = this.transformer.fromInventoryInfos(inventoryRecords, skuMap);

      return this.success<{ inventory: InventoryItem[] }>({ inventory });
    } catch (error: unknown) {
      return this.failure<{ inventory: InventoryItem[] }>(
        `Inventory lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }
}
