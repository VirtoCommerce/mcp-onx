/**
 * Order transformation utilities
 */

import type {
  Order,
  OrderLineItem,
  CustomField,
  Address,
  CreateSalesOrderInput,
  UpdateOrderInput,
} from '@cof-org/mcp';
import { STATUS_MAP, REVERSE_STATUS_MAP } from '../types.js';
import type { CustomerOrder, LineItem, Shipment, DynamicObjectProperty, Contact } from '../models/index.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer } from './address.transformer.js';
import { CustomerTransformer } from './customer.transformer.js';

export class OrderTransformer extends BaseTransformer {
  private addressTransformer: AddressTransformer;
  private customerTransformer: CustomerTransformer;
  private workspace?: string;
  private catalogId?: string;

  constructor(tenantId: string = 'default-workspace', workspace?: string) {
    super(tenantId);
    this.workspace = workspace;
    this.addressTransformer = new AddressTransformer(tenantId);
    this.customerTransformer = new CustomerTransformer(tenantId);
  }

  override setTenantId(tenantId: string): void {
    super.setTenantId(tenantId);
    this.addressTransformer.setTenantId(tenantId);
    this.customerTransformer.setTenantId(tenantId);
  }

  setWorkspace(workspace: string): void {
    this.workspace = workspace;
  }

  setCatalogId(catalogId: string): void {
    this.catalogId = catalogId;
  }

  /**
   * Transform VirtoCommerce order to MCP Order format
   * @param order - The VirtoCommerce CustomerOrder
   * @param contact - Optional loaded Contact for the customer (if available)
   */
  toMcpOrder(order: CustomerOrder, contact?: Contact): Order {
    const shippingAddress = order.shipments
      ?.map((x) => x.deliveryAddress)
      .find((x) => x);

    const orderId = order.id ?? '';

    // Use loaded contact if available, otherwise fall back to order data
    const customer = contact
      ? this.customerTransformer.fromContact(contact)
      : this.customerTransformer.fromOrder(order);

    return {
      id: orderId,
      externalId: order.outerId,
      name: order.number ?? '',
      status: this.mapOrderStatus(order.status ?? ''),
      totalPrice: order.total,
      currency: order.currency,
      customer,
      shippingAddress: this.addressTransformer.toMcpAddress(shippingAddress),
      billingAddress: this.addressTransformer.toMcpAddress(order.addresses?.[0]),
      lineItems: order.items?.map((item, index) => this.toOrderLineItem(orderId, item, index)) ?? [],
      createdAt: order.createdDate ?? this.now(),
      updatedAt: order.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
      customFields: this.transformDynamicProperties(order.dynamicProperties),
      orderNote: order.comment,
    };
  }

  /**
   * Transform multiple orders with optional customer data
   * @param orders - Array of VirtoCommerce CustomerOrders
   * @param customerMap - Optional map of customer IDs to Contact objects
   */
  toMcpOrders(orders: CustomerOrder[], customerMap?: Map<string, Contact>): Order[] {
    return orders.map((order) => {
      const contact = order.customerId ? customerMap?.get(order.customerId) : undefined;
      return this.toMcpOrder(order, contact);
    });
  }

  /**
   * Transform CreateSalesOrderInput to API payload
   */
  fromCreateSalesOrderInput(
    input: CreateSalesOrderInput,
    skuProductMap?: Map<string, { id: string; name: string }>
  ): CustomerOrder {
    const order = input.order;
    if (!order) {
      return {};
    }

    const currency = order.currency ?? 'USD';

    const addresses = [
      order.shippingAddress
        ? this.addressTransformer.toVirtoAddress(order.shippingAddress, 'Shipping')
        : undefined,
      order.billingAddress
        ? this.addressTransformer.toVirtoAddress(order.billingAddress, 'Billing')
        : undefined,
    ].filter((a): a is NonNullable<typeof a> => a !== undefined);

    const items: LineItem[] =
      order.lineItems?.map((item) => {
        const resolved = skuProductMap?.get(item.sku);
        return {
          productId: resolved?.id,
          sku: item.sku,
          name: item.name ?? resolved?.name ?? item.sku,
          quantity: item.quantity ?? 0,
          price: item.unitPrice ?? 0,
          placedPrice: item.unitPrice ?? 0,
          currency,
          catalogId: this.catalogId,
        };
      }) ?? [];

    const shipments: Shipment[] = order.shippingAddress
      ? [
          {
            deliveryAddress: this.addressTransformer.toVirtoAddress(
              order.shippingAddress,
              'Shipping'
            ),
            currency,
          },
        ]
      : [];

    const customerName = order.customer
      ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ')
        || order.customer.email
        || order.customer.id
        || order.customer.externalId
      : undefined;

    return {
      outerId: order.externalId,
      number: order.name ?? order.externalId ?? `ORD-${Date.now()}`,
      status: order.status ? this.reverseMapStatus(order.status) : 'New',
      currency,
      total: order.totalPrice,
      subTotal: order.subTotalPrice,
      customerId: order.customer?.id ?? order.customer?.externalId,
      customerName,
      storeId: this.workspace,
      comment: order.orderNote,
      items,
      addresses: addresses.length ? addresses : undefined,
      shipments: shipments.length ? shipments : undefined,
    };
  }

  /**
   * Apply MCP update fields to a VirtoCommerce CustomerOrder object.
   * Returns the modified order ready for PUT save.
   */
  applyUpdatesToOrder(order: CustomerOrder, updates: UpdateOrderInput['updates']): CustomerOrder {
    const updated = { ...order };

    const status = this.valueOrUndefined((updates as { status?: string | null | undefined }).status);
    if (status) {
      updated.status = this.reverseMapStatus(status);
    }

    const orderNote = this.valueOrUndefined((updates as { orderNote?: string | null }).orderNote);
    if (orderNote !== undefined) {
      updated.comment = orderNote.slice(0, 2048);
    }

    const shippingAddress = this.valueOrUndefined(
      (updates as { shippingAddress?: Address | null }).shippingAddress
    );
    if (shippingAddress) {
      const virtoShipping = this.addressTransformer.toVirtoAddress(shippingAddress, 'Shipping');
      // Update shipping address on the first shipment
      if (updated.shipments?.length) {
        updated.shipments = updated.shipments.map((s, i) =>
          i === 0 ? { ...s, deliveryAddress: virtoShipping } : s
        );
      }
      // Also update in the order-level addresses array
      this.upsertAddress(updated, virtoShipping, 'Shipping');
    }

    const billingAddress = this.valueOrUndefined(
      (updates as { billingAddress?: Address | null }).billingAddress
    );
    if (billingAddress) {
      const virtoBilling = this.addressTransformer.toVirtoAddress(billingAddress, 'Billing');
      this.upsertAddress(updated, virtoBilling, 'Billing');
    }

    const lineItems = this.valueOrUndefined(
      (updates as { lineItems?: UpdateOrderInput['updates']['lineItems'] }).lineItems
    );
    if (lineItems?.length) {
      updated.items = (updated.items ?? []).map((item) => {
        const patch = lineItems.find((li) => li.sku === item.sku);
        if (!patch) { return item; }
        return {
          ...item,
          quantity: patch.quantity ?? item.quantity,
          price: patch.unitPrice ?? item.price,
          placedPrice: patch.unitPrice ?? item.placedPrice,
          name: patch.name ?? item.name,
        };
      });
    }

    return updated;
  }

  /**
   * Upsert an address in the order's addresses array by type.
   * Replaces the first address of the given type, or appends if none found.
   */
  private upsertAddress(
    order: CustomerOrder,
    address: import('../models/index.js').Address,
    type: 'Billing' | 'Shipping'
  ): void {
    if (!order.addresses) {
      order.addresses = [];
    }
    const idx = order.addresses.findIndex((a) => a.addressType === type);
    if (idx >= 0) {
      order.addresses[idx] = address;
    } else {
      order.addresses.push(address);
    }
  }

  /**
   * Transform line item from VirtoCommerce format
   */
  private toOrderLineItem(orderId: string, item: LineItem, index: number): OrderLineItem {
    const sku = item.sku ?? '';
    const quantity = item.quantity ?? 0;
    const price = item.price ?? 0;

    return {
      id: item.id ?? `${orderId}-${sku}-${index}`,
      sku,
      quantity,
      unitPrice: price,
      totalPrice: item.extendedPrice ?? price * quantity,
      name: item.name ?? '',
    };
  }

  /**
   * Transform dynamic properties to custom fields
   */
  private transformDynamicProperties(
    properties?: DynamicObjectProperty[]
  ): CustomField[] | undefined {
    if (!properties?.length) {
      return undefined;
    }

    const entries = properties
      .filter((prop) => prop.values?.length)
      .map((prop) => ({
        name: prop.name ?? '',
        value: String(prop.values?.[0]?.value ?? ''),
      }));

    return entries.length ? entries : undefined;
  }

  /**
   * Map VirtoCommerce status to normalized status
   */
  private mapOrderStatus(status: string): string {
    return STATUS_MAP[status] ?? status;
  }

  /**
   * Reverse map normalized status to VirtoCommerce status
   */
  private reverseMapStatus(status: string): string {
    return REVERSE_STATUS_MAP[status] ?? status;
  }
}
