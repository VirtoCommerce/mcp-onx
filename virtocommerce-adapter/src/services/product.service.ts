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
import type { YourFulfillmentProduct, YourFulfillmentInventory } from '../types.js';
import { BaseService } from './base.service.js';
import { ProductTransformer } from '../transformers/product.transformer.js';
import {
  mapProductFilters,
  mapProductVariantFilters,
  mapInventoryFilters,
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
      const response = await this.client.get<YourFulfillmentProduct[] | YourFulfillmentProduct>(
        '/products',
        mapProductFilters(input)
      );

      if (!response.success) {
        return this.failure<{ products: Product[] }>(
          'Failed to fetch products',
          response.error ?? response
        );
      }

      const products = this.transformer.toMcpProducts(this.ensureArray(response.data));
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
      const response = await this.client.get<YourFulfillmentProduct[] | YourFulfillmentProduct>(
        '/products',
        mapProductVariantFilters(input)
      );

      if (!response.success) {
        return this.failure<{ productVariants: ProductVariant[] }>(
          'Failed to fetch product variants',
          response.error ?? response
        );
      }

      const productVariants = this.transformer.toMcpProductVariants(this.ensureArray(response.data));
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
      const response = await this.client.get<YourFulfillmentInventory[] | YourFulfillmentInventory>(
        '/inventory',
        mapInventoryFilters(input)
      );

      if (!response.success) {
        return this.failure<{ inventory: InventoryItem[] }>(
          'Failed to fetch inventory',
          response.error ?? response
        );
      }

      const inventory = this.transformer.toMcpInventory(this.ensureArray(response.data));
      return this.success<{ inventory: InventoryItem[] }>({ inventory });
    } catch (error: unknown) {
      return this.failure<{ inventory: InventoryItem[] }>(
        `Inventory lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }
}
