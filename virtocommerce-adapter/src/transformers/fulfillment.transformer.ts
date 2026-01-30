/**
 * Fulfillment/Shipment transformation utilities
 */

import type { Fulfillment, FulfillOrderInput } from '@cof-org/mcp';
import type { Shipment } from '../models/index.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer } from './address.transformer.js';

const SHIPMENT_STATUS_MAP: Record<string, string> = {
  New: 'pending',
  PickPack: 'processing',
  ReadyToShip: 'ready_to_ship',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
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

  /**
   * Transform VirtoCommerce Shipment to MCP Fulfillment format
   */
  fromShipment(shipment: Shipment): Fulfillment {
    const trackingNumbers = shipment.trackingNumber ? [shipment.trackingNumber] : [];

    const lineItems = (shipment.items ?? []).map((item, index) => ({
      id: item.id ?? item.lineItemId ?? `${shipment.id}-item-${index}`,
      sku: item.lineItem?.sku ?? '',
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
      shippingNote: shipment.trackingUrl ?? shipment.comment,
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
  fromFulfillOrderInput(input: FulfillOrderInput): Record<string, unknown> {
    return {
      trackingNumber: input.trackingNumbers?.[0],
      shipmentMethodCode: input.shippingCarrier,
      shipmentMethodOption: input.shippingClass,
      fulfillmentCenterId: input.locationId,
      deliveryDate: input.expectedDeliveryDate,
      deliveryAddress: input.shippingAddress
        ? {
            line1: input.shippingAddress.address1,
            line2: input.shippingAddress.address2,
            city: input.shippingAddress.city,
            regionName: input.shippingAddress.stateOrProvince,
            postalCode: input.shippingAddress.zipCodeOrPostalCode,
            countryName: input.shippingAddress.country,
            phone: input.shippingAddress.phone,
            email: input.shippingAddress.email,
            name: [input.shippingAddress.firstName, input.shippingAddress.lastName]
              .filter(Boolean)
              .join(' '),
            organization: input.shippingAddress.company,
          }
        : undefined,
      items: input.lineItems?.map((item) => ({
        sku: item.sku,
        quantity: item.quantity ?? 0,
      })),
      comment: input.giftNote ?? input.shippingNote,
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
