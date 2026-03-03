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
} from '@virtocommerce/cof-mcp';
import type {
  ProductSearchResult,
  InventorySearchResult,
  InventorySearchCriteria,
  PriceEvaluationContext,
  EvaluatedPrice,
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
  private storeId?: string;

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

  setStoreId(storeId: string): void {
    this.storeId = storeId;
  }

  async getProducts(input: GetProductsInput): Promise<FulfillmentToolResult<{ products: Product[] }>> {
    try {
      const searchCriteria = mapProductFiltersToSearchCriteria(input);

      // Filter by catalog when catalogId is configured
      if (this.catalogId) {
        searchCriteria.catalogIds = [this.catalogId];
      }

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

  /**
   * Resolve SKU codes to a Map of code → { id, name, price? } from the catalog
   * via /api/catalog/search/products with searchPhrase and responseGroup=None.
   * Optionally evaluates prices via /api/pricing/evaluate.
   * Public so other services (e.g. OrderService) can resolve SKUs to product info.
   */
  async resolveSkuProductMap(
    skus: string[],
    options?: { currency?: string; customerId?: string }
  ): Promise<Map<string, { id: string; name: string; price?: number }>> {
    const map = new Map<string, { id: string; name: string; price?: number }>();

    const response = await this.client.post<ProductSearchResult>(
      '/api/catalog/search/products',
      {
        searchPhrase: `code:${skus.join(',')}`,
        responseGroup: 'None',
        searchInVariations: true,
        catalogIds: this.catalogId ? [this.catalogId] : undefined,
        take: skus.length,
      }
    );

    if (!response.success || !response.data) {
      return map;
    }

    const items = response.data.items ?? [];
    const productIdToCode = new Map<string, string>();
    for (const item of items) {
      if (item.id && item.code) {
        map.set(item.code, { id: item.id, name: item.name ?? '' });
        productIdToCode.set(item.id, item.code);
      }
    }

    // Evaluate prices only when options are provided (i.e. during order creation) — non-fatal on failure
    if (options && productIdToCode.size > 0) {
      try {
        const priceContext: PriceEvaluationContext = {
          productIds: Array.from(productIdToCode.keys()),
          storeId: this.storeId,
          catalogId: this.catalogId,
          currency: options?.currency,
          customerId: options?.customerId,
        };

        const priceResponse = await this.client.post<EvaluatedPrice[]>(
          '/api/pricing/evaluate',
          priceContext
        );

        if (priceResponse.success && Array.isArray(priceResponse.data)) {
          for (const ep of priceResponse.data) {
            if (!ep.productId) { continue; }
            const code = productIdToCode.get(ep.productId);
            if (!code) { continue; }
            const existing = map.get(code);
            if (!existing) { continue; }
            const effectivePrice = ep.sale ?? ep.list;
            if (effectivePrice != null) {
              existing.price = effectivePrice;
            }
          }
        }
      } catch {
    // Pricing failure is non-fatal — proceed without prices
      }
    }

    return map;
  }

  /**
   * Resolve SKU codes to product IDs via /api/catalog/search/products
   */
  private async resolveSkusToIds(skus: string[]): Promise<string[]> {
    const map = await this.resolveSkuProductMap(skus);
    return Array.from(map.values()).map((v) => v.id);
  }

  async getProductVariants(
    input: GetProductVariantsInput
  ): Promise<FulfillmentToolResult<{ productVariants: ProductVariant[] }>> {
    try {
      const searchCriteria = mapProductVariantFiltersToSearchCriteria(input);

      // Filter by catalog when catalogId is configured
      if (this.catalogId) {
        searchCriteria.catalogIds = [this.catalogId];
      }

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
      // Step 1: Resolve SKUs to product IDs via search/products
      const resolvedIds = await this.resolveSkusToIds(input.skus);

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
