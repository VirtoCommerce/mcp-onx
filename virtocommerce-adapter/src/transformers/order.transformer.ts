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
import type { CustomerOrder, LineItem, DynamicObjectProperty, Contact } from '../models/index.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer } from './address.transformer.js';
import { CustomerTransformer } from './customer.transformer.js';

export class OrderTransformer extends BaseTransformer {
  private addressTransformer: AddressTransformer;
  private customerTransformer: CustomerTransformer;
  private workspace?: string;

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
  fromCreateSalesOrderInput(input: CreateSalesOrderInput): Record<string, unknown> {
    const order = input.order;
    if (!order) {
      return {};
    }

    return {
      external_id: order.externalId ?? order.name,
      status: order.status,
      total: order.totalPrice,
      currency: order.currency ?? 'USD',
      customer: order.customer
        ? {
          id: order.customer.id ?? order.customer.externalId ?? order.customer.email,
          email: order.customer.email,
          first_name: order.customer.firstName,
          last_name: order.customer.lastName,
          phone: order.customer.phone,
        }
        : undefined,
      items: order.lineItems?.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity ?? 0,
        price: item.unitPrice ?? 0,
        subtotal: item.totalPrice ?? item.unitPrice ?? 0,
        discount: 0,
        tax: 0,
      })),
      shipping_address: this.addressTransformer.toFulfillmentAddress(order.shippingAddress),
      billing_address: this.addressTransformer.toFulfillmentAddress(order.billingAddress),
      notes: order.orderNote,
      metadata: {
        source: order.orderSource,
        workspace: this.workspace,
      },
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
      updated.comment = orderNote;
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
