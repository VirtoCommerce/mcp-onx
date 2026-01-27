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
  CatalogProduct,
  InventorySearchResult,
  InventorySearchCriteria,
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

  constructor(client: ApiClient, tenantId: string = 'default-workspace') {
    super(client);
    this.transformer = new ProductTransformer(tenantId);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  async getProducts(input: GetProductsInput): Promise<FulfillmentToolResult<{ products: Product[] }>> {
    try {
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

      const results = response.data?.results ?? [];
      const products = this.transformer.fromCatalogProducts(results);
      return this.success<{ products: Product[] }>({ products });
    } catch (error: unknown) {
      return this.failure<{ products: Product[] }>(
        `Product lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
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

      const results = response.data?.results ?? [];
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
      // Step 1: Resolve SKUs to product IDs via catalog search
      const catalogResponse = await this.client.post<ProductSearchResult>(
        '/api/catalog/search/products',
        {
          codes: input.skus,
          responseGroup: 'ItemInfo',
          searchInVariations: true,
          take: input.skus.length,
        }
      );

      if (!catalogResponse.success) {
        return this.failure<{ inventory: InventoryItem[] }>(
          'Failed to resolve product SKUs',
          catalogResponse.error ?? catalogResponse
        );
      }

      const products = catalogResponse.data?.results ?? [];
      if (!products.length) {
        return this.success<{ inventory: InventoryItem[] }>({ inventory: [] });
      }

      // Build SKU map: productId → SKU code
      const skuMap = new Map<string, string>();
      for (const product of products) {
        if (product.id && product.code) {
          skuMap.set(product.id, product.code);
        }
      }

      const productIds = products
        .map((p: CatalogProduct) => p.id)
        .filter((id): id is string => !!id);

      // Step 2: Query inventory for resolved product IDs
      const inventoryCriteria: InventorySearchCriteria = {
        productIds,
        take: productIds.length * 10, // Allow multiple locations per product
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
