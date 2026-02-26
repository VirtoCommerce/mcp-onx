/**
 * Product, Product Variant, and Inventory transformation utilities
 */

import type { Product, ProductVariant, InventoryItem } from '@virtocommerce/cof-mcp';
import type { CatalogProduct, ProductProperty, InventoryInfo } from '../models/index.js';
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
    const imageURLs = variation.images
      ?.map((img) => img.url ?? img.relativeUrl)
      .filter((url): url is string => !!url);

    const selectedOptions = this.extractSelectedOptions(variation);

    const weight = this.extractWeight(variation);
    const dimensions = this.extractDimensions(variation);

    // Resolve taxable: a non-empty taxType indicates the variant is taxable
    const taxType = variation.taxType ?? parentProduct?.taxType;
    const taxable = taxType ? true : undefined;

    return {
      id: variation.id ?? '',
      externalId: variation.outerId,
      externalProductId: parentProduct?.code ?? variation.code,
      productId: variation.mainProductId ?? parentProduct?.id ?? '',
      sku: variation.code ?? '',
      barcode: variation.gtin,
      title: variation.name ?? parentProduct?.name ?? '',
      selectedOptions,
      taxable,
      inventoryNotTracked: variation.trackInventory === false ? true : undefined,
      weight,
      dimensions,
      imageURLs: imageURLs?.length ? imageURLs : undefined,
      customFields: this.extractCustomFields(variation.properties),
      createdAt: variation.createdDate ?? this.now(),
      updatedAt: variation.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple product variations.
   * Products with variations return each variation as a separate ProductVariant.
   * Products without variations are treated as single-variant products.
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
   * Extract selected option values from a variation's properties
   */
  private extractSelectedOptions(
    variation: CatalogProduct
  ): { name: string; value: string }[] | undefined {
    if (!variation.properties?.length) {
      return undefined;
    }

    const options = variation.properties
      .filter((p) => p.type === 'Variation' && p.name && p.values?.length)
      .map((p) => ({
        name: p.name!,
        value: String(p.values![0]!.value ?? ''),
      }))
      .filter((o) => o.value);

    return options.length ? options : undefined;
  }

  /**
   * Extract weight from VirtoCommerce product dimensions
   */
  private extractWeight(
    product: CatalogProduct
  ): { value: number; unit: 'lb' | 'oz' | 'kg' | 'g' } | undefined {
    if (product.weight == null) {
      return undefined;
    }

    const unitMap: Record<string, 'lb' | 'oz' | 'kg' | 'g'> = {
      lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
      oz: 'oz', ounce: 'oz', ounces: 'oz',
      kg: 'kg', kilogram: 'kg', kilograms: 'kg',
      g: 'g', gram: 'g', grams: 'g',
    };

    const rawUnit = (product.weightUnit ?? 'kg').toLowerCase();
    const unit = unitMap[rawUnit] ?? 'kg';

    return { value: product.weight, unit };
  }

  /**
   * Extract dimensions from VirtoCommerce product
   */
  private extractDimensions(
    product: CatalogProduct
  ): { length: number; width: number; height: number; unit: 'cm' | 'in' | 'ft' } | undefined {
    if (product.length == null && product.width == null && product.height == null) {
      return undefined;
    }

    const unitMap: Record<string, 'cm' | 'in' | 'ft'> = {
      cm: 'cm', centimeter: 'cm', centimeters: 'cm',
      in: 'in', inch: 'in', inches: 'in',
      ft: 'ft', foot: 'ft', feet: 'ft',
    };

    const rawUnit = (product.measureUnit ?? 'cm').toLowerCase();
    const unit = unitMap[rawUnit] ?? 'cm';

    return {
      length: product.length ?? 0,
      width: product.width ?? 0,
      height: product.height ?? 0,
      unit,
    };
  }

  /**
   * Transform a VirtoCommerce InventoryInfo to an MCP InventoryItem.
   * Requires the product SKU to be passed in because InventoryInfo
   * only stores productId, not the SKU code.
   */
  fromInventoryInfo(info: InventoryInfo, sku: string): InventoryItem {
    const inStock = info.inStockQuantity ?? 0;
    const reserved = info.reservedQuantity ?? 0;
    const available = inStock - reserved;

    return {
      sku,
      locationId: info.fulfillmentCenterId ?? '',
      available: Math.max(available, 0),
      onHand: inStock,
      unavailable: reserved,
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple VirtoCommerce InventoryInfo records.
   * Each record represents stock for one product at one fulfillment center.
   *
   * @param records - InventoryInfo records from VirtoCommerce
   * @param skuMap  - Map of productId → SKU for resolving codes
   */
  fromInventoryInfos(records: InventoryInfo[], skuMap: Map<string, string>): InventoryItem[] {
    return records
      .map((info) => {
        const sku = info.productId ? skuMap.get(info.productId) : undefined;
        if (!sku) {
          return undefined;
        }
        return this.fromInventoryInfo(info, sku);
      })
      .filter((item): item is InventoryItem => item != null);
  }

  /**
   * Map product status from VirtoCommerce fields
   */
  private mapProductStatus(product: CatalogProduct): string {
    if (!product.isActive) {
      return 'inactive';
    }
    if (!product.isBuyable) {
      return 'draft';
    }
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
      if (!variation.properties) {
        continue;
      }
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
    if (!properties?.length) {
      return undefined;
    }

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
    if (!properties?.length) {
      return undefined;
    }

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
