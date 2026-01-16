/**
 * Product, Product Variant, and Inventory transformation utilities
 */

import type { Product, ProductVariant, InventoryItem } from '@cof-org/mcp';
import type { YourFulfillmentProduct, YourFulfillmentInventory } from '../types.js';
import { BaseTransformer } from './base.js';

export class ProductTransformer extends BaseTransformer {
  /**
   * Transform YourFulfillment product to MCP Product format
   */
  toMcpProduct(product: YourFulfillmentProduct): Product {
    return {
      id: product.id,
      externalId: product.sku,
      name: product.name,
      description: product.description,
      status: product.status,
      options: [],
      tags: product.attributes ? Object.keys(product.attributes) : undefined,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple products
   */
  toMcpProducts(products: YourFulfillmentProduct[]): Product[] {
    return products.map((product) => this.toMcpProduct(product));
  }

  /**
   * Transform YourFulfillment product to MCP ProductVariant format
   */
  toMcpProductVariant(product: YourFulfillmentProduct): ProductVariant {
    return {
      id: `${product.id}-default`,
      productId: product.id,
      sku: product.sku,
      title: product.name,
      price: product.price,
      currency: 'USD',
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple products to variants
   */
  toMcpProductVariants(products: YourFulfillmentProduct[]): ProductVariant[] {
    return products.map((product) => this.toMcpProductVariant(product));
  }

  /**
   * Transform YourFulfillment inventory to MCP InventoryItem array
   * Handles both single location and multi-location inventory
   */
  toMcpInventoryItems(inventory: YourFulfillmentInventory): InventoryItem[] {
    if (inventory.warehouse_locations?.length) {
      return inventory.warehouse_locations.map((location) => ({
        locationId: location.location_id,
        sku: inventory.sku,
        available: location.available,
        onHand: location.available + location.reserved,
        unavailable: location.reserved,
        tenantId: this.tenantId,
      }));
    }

    return [
      {
        locationId: '',
        sku: inventory.sku,
        available: inventory.available,
        onHand: inventory.total,
        unavailable: inventory.total - inventory.available,
        tenantId: this.tenantId,
      },
    ];
  }

  /**
   * Transform multiple inventory records
   */
  toMcpInventory(inventoryItems: YourFulfillmentInventory[]): InventoryItem[] {
    return inventoryItems.flatMap((item) => this.toMcpInventoryItems(item));
  }
}
