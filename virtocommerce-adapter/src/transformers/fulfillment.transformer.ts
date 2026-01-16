/**
 * Fulfillment/Shipment transformation utilities
 */

import type { Fulfillment, FulfillOrderInput, Address } from '@cof-org/mcp';
import type { YourFulfillmentShipment } from '../types.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer } from './address.transformer.js';

export class FulfillmentTransformer extends BaseTransformer {
  private addressTransformer: AddressTransformer;

  constructor(tenantId: string = 'default-workspace') {
    super(tenantId);
    this.addressTransformer = new AddressTransformer(tenantId);
  }

  override setTenantId(tenantId: string): void {
    super.setTenantId(tenantId);
    this.addressTransformer.setTenantId(tenantId);
  }

  /**
   * Transform YourFulfillment shipment to MCP Fulfillment format
   */
  toMcpFulfillment(shipment: YourFulfillmentShipment): Fulfillment {
    return {
      id: shipment.id,
      externalId: shipment.tracking_number,
      orderId: shipment.order_id,
      trackingNumbers: shipment.tracking_number ? [shipment.tracking_number] : [],
      shippingCarrier: shipment.carrier,
      shippingClass: shipment.service,
      status: shipment.status,
      shippingAddress: this.addressTransformer.toMcpAddress(shipment.to_address as any),
      lineItems: shipment.items.map((item, index) => ({
        id: `${shipment.id}-${item.sku}-${index}`,
        sku: item.sku,
        quantity: item.quantity,
      })),
      createdAt: shipment.shipped_at ?? this.now(),
      updatedAt: shipment.delivered_at ?? shipment.shipped_at ?? this.now(),
      tenantId: this.tenantId,
      expectedDeliveryDate: shipment.delivered_at,
      expectedShipDate: shipment.shipped_at,
      shippingNote: shipment.tracking_url,
    };
  }

  /**
   * Transform multiple shipments
   */
  toMcpFulfillments(shipments: YourFulfillmentShipment[]): Fulfillment[] {
    return shipments.map((shipment) => this.toMcpFulfillment(shipment));
  }

  /**
   * Transform FulfillOrderInput to API payload
   */
  fromFulfillOrderInput(input: FulfillOrderInput): Record<string, unknown> {
    return {
      tracking_number: input.trackingNumbers?.[0] ?? undefined,
      carrier: input.shippingCarrier,
      service: input.shippingClass,
      location_id: input.locationId,
      shipped_at: input.shipByDate ?? this.now(),
      expected_delivery: input.expectedDeliveryDate,
      items: input.lineItems?.map((item) => ({
        sku: item.sku,
        quantity: item.quantity ?? 0,
      })),
      shipping_address: this.addressTransformer.toFulfillmentAddress(input.shippingAddress),
      incoterms: input.incoterms,
      notes: input.giftNote,
    };
  }
}
