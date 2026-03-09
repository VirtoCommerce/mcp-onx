/**
 * Fulfillment/Shipment transformation utilities
 */

import type { Fulfillment, FulfillOrderInput } from '@virtocommerce/cof-mcp';
import type { Shipment, ShipmentItem, LineItem } from '../models/index.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer, type CountryEntry } from './address.transformer.js';

const SHIPMENT_STATUS_MAP: Record<string, string> = {
  // Standard VC shipment statuses (from ModuleConstants)
  New: 'pending',
  PickPack: 'processing',
  ReadyToSend: 'ready_to_send',
  Sent: 'shipped',
  Cancelled: 'cancelled',
  // Non-standard but kept for backwards compatibility
  Shipped: 'shipped',
  Delivered: 'delivered',
  OnHold: 'on_hold',
  PartiallyShipped: 'partially_shipped',
};

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

  setCountries(countries: CountryEntry[]): void {
    this.addressTransformer.setCountries(countries);
  }

  /**
   * Transform VirtoCommerce Shipment to MCP Fulfillment format
   */
  fromShipment(shipment: Shipment): Fulfillment {
    const trackingNumbers = shipment.trackingNumber ? [shipment.trackingNumber] : [];

    const lineItems = (shipment.items ?? []).map((item, index) => ({
      id: item.id ?? item.lineItemId ?? `${shipment.id}-item-${index}`,
      sku: item.lineItem?.sku || item.lineItemId || `unknown-${index}`,
      quantity: item.quantity ?? 0,
      name: item.lineItem?.name,
    }));

    return {
      id: shipment.id ?? '',
      externalId: shipment.outerId,
      orderId: shipment.customerOrderId ?? shipment.customerOrder?.id ?? '',
      status: this.mapShipmentStatus(shipment.status),
      trackingNumbers,
      lineItems,
      locationId: shipment.fulfillmentCenterId,
      shippingAddress: this.addressTransformer.toMcpAddress(shipment.deliveryAddress),
      shippingCarrier: shipment.shippingMethod?.name ?? shipment.shipmentMethodCode,
      shippingClass: shipment.shipmentMethodOption,
      shippingCode: shipment.shipmentMethodCode,
      shippingPrice: shipment.price,
      shippingNote: shipment.comment,
      expectedDeliveryDate: shipment.deliveryDate,
      createdAt: shipment.createdDate ?? this.now(),
      updatedAt: shipment.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple VirtoCommerce shipments
   */
  fromShipments(shipments: Shipment[]): Fulfillment[] {
    return shipments.map((shipment) => this.fromShipment(shipment));
  }

  /**
   * Transform FulfillOrderInput to VirtoCommerce Shipment payload
   */
  fromFulfillOrderInput(input: FulfillOrderInput, orderItems?: LineItem[], orderCurrency?: string): Shipment {
    // Resolve input line items (by SKU) to VirtoCommerce ShipmentItems (by lineItemId)
    const shipmentItems: ShipmentItem[] = [];
    for (const inputItem of input.lineItems ?? []) {
      const matchedLineItem = orderItems?.find((li) => li.sku === inputItem.sku);
      if (matchedLineItem?.id) {
        shipmentItems.push({
          lineItemId: matchedLineItem.id,
          quantity: inputItem.quantity ?? matchedLineItem.quantity ?? 0,
        });
      }
    }

    const commentParts = [input.giftNote, input.shippingNote].filter(Boolean);
    const comment = commentParts.length > 0
      ? commentParts.join('\n').slice(0, 2048)
      : undefined;

    return {
      trackingNumber: input.trackingNumbers?.[0],
      shipmentMethodCode: input.shippingCarrier,
      shipmentMethodOption: input.shippingClass,
      fulfillmentCenterId: input.locationId,
      deliveryDate: input.expectedDeliveryDate,
      deliveryAddress: input.shippingAddress
        ? this.addressTransformer.toVirtoAddress(input.shippingAddress, 'Shipping')
        : undefined,
      items: shipmentItems,
      comment,
      currency: orderCurrency,
      price: input.shippingPrice,
    };
  }

  /**
   * Map VirtoCommerce shipment status to normalized status
   */
  private mapShipmentStatus(status?: string): string {
    if (!status) {
      return 'pending';
    }
    return SHIPMENT_STATUS_MAP[status] ?? status;
  }
}
