/**
 * Product, Product Variant, and Inventory transformation utilities
 */

import type { Product, ProductVariant, InventoryItem } from '@cof-org/mcp';
import type { YourFulfillmentInventory } from '../types.js';
import type { CatalogProduct, ProductProperty } from '../models/index.js';
import { BaseTransformer } from './base.js';

export class ProductTransformer extends BaseTransformer {
  /**
   * Transform VirtoCommerce CatalogProduct to MCP Product format
   */
  fromCatalogProduct(product: CatalogProduct): Product {
    const description =
      product.reviews?.find((r) => r.reviewType === 'FullReview')?.content ??
      product.reviews?.[0]?.content;

    const imageURLs = product.images
      ?.map((img) => img.url ?? img.relativeUrl)
      .filter((url): url is string => !!url);

    const categories = product.categories
      ?.map((cat) => cat.name)
      .filter((name): name is string => !!name);

    return {
      id: product.id ?? '',
      externalId: product.outerId,
      externalProductId: product.code,
      name: product.name ?? '',
      description,
      handle: product.path ?? product.code,
      status: this.mapProductStatus(product),
      tags: this.extractTags(product.properties),
      vendor: product.vendor,
      categories,
      options: this.extractOptions(product),
      imageURLs,
      customFields: this.extractCustomFields(product.properties),
      createdAt: product.createdDate ?? this.now(),
      updatedAt: product.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple VirtoCommerce products
   */
  fromCatalogProducts(products: CatalogProduct[]): Product[] {
    return products.map((product) => this.fromCatalogProduct(product));
  }

  /**
   * Transform VirtoCommerce CatalogProduct to MCP ProductVariant format
   */
  fromCatalogProductVariant(variation: CatalogProduct, parentProduct?: CatalogProduct): ProductVariant {
    return {
      id: variation.id ?? '',
      productId: variation.mainProductId ?? parentProduct?.id ?? '',
      sku: variation.code ?? '',
      title: variation.name ?? parentProduct?.name ?? '',
      price: undefined,
      currency: undefined,
      createdAt: variation.createdDate ?? this.now(),
      updatedAt: variation.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple product variations
   */
  fromCatalogProductVariants(products: CatalogProduct[]): ProductVariant[] {
    return products.flatMap((product) => {
      if (product.variations?.length) {
        return product.variations.map((v) => this.fromCatalogProductVariant(v, product));
      }
      // If no variations, treat the product itself as a variant
      return [this.fromCatalogProductVariant(product)];
    });
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

  /**
   * Map product status from VirtoCommerce fields
   */
  private mapProductStatus(product: CatalogProduct): string {
    if (!product.isActive) return 'inactive';
    if (!product.isBuyable) return 'draft';
    return 'active';
  }

  /**
   * Extract option dimensions from product variations
   */
  private extractOptions(product: CatalogProduct): { name: string; values: string[] }[] {
    if (!product.variations?.length) {
      return [];
    }

    // Collect variation properties that differ across variations
    const optionMap = new Map<string, Set<string>>();

    for (const variation of product.variations) {
      if (!variation.properties) continue;
      for (const prop of variation.properties) {
        if (prop.type === 'Variation' && prop.name && prop.values?.length) {
          const values = optionMap.get(prop.name) ?? new Set<string>();
          for (const val of prop.values) {
            if (val.value != null) {
              values.add(String(val.value));
            }
          }
          optionMap.set(prop.name, values);
        }
      }
    }

    return Array.from(optionMap.entries()).map(([name, valuesSet]) => ({
      name,
      values: Array.from(valuesSet),
    })) as { name: string; values: string[] }[];
  }

  /**
   * Extract tags from product properties
   */
  private extractTags(properties?: ProductProperty[]): string[] | undefined {
    if (!properties?.length) return undefined;

    const tagProp = properties.find(
      (p) => p.name?.toLowerCase() === 'tags' || p.name?.toLowerCase() === 'tag'
    );

    if (tagProp?.values?.length) {
      const tags = tagProp.values
        .map((v) => (v.value != null ? String(v.value) : ''))
        .filter(Boolean);
      return tags.length ? tags : undefined;
    }

    return undefined;
  }

  /**
   * Extract custom fields from product properties
   */
  private extractCustomFields(
    properties?: ProductProperty[]
  ): { name: string; value: string }[] | undefined {
    if (!properties?.length) return undefined;

    const fields = properties
      .filter((p) => p.type === 'Product' && p.values?.length)
      .map((p) => ({
        name: p.name ?? '',
        value: String(p.values?.[0]?.value ?? ''),
      }))
      .filter((f) => f.name && f.value);

    return fields.length ? fields : undefined;
  }
}
