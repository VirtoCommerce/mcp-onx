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
import { STATUS_MAP } from '../types.js';
import type { CustomerOrder, LineItem } from '../models/customer-order.js';
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
   */
  toMcpOrder(order: CustomerOrder): Order {
    const shippingAddress = order.shipments
      ?.map((x) => x.deliveryAddress)
      .find((x) => x);

    return {
      id: order.id,
      externalId: order.id,
      name: order.number,
      status: this.mapOrderStatus(order.status),
      totalPrice: order.total,
      currency: order.currency,
      customer: this.customerTransformer.fromOrder(order),
      shippingAddress: this.addressTransformer.toMcpAddress(shippingAddress),
      billingAddress: this.addressTransformer.toMcpAddress(order.addresses?.[0]),
      lineItems: order.items?.map((item, index) => this.toOrderLineItem(order.id, item, index)),
      createdAt: order.createdDate,
      updatedAt: order.modifiedDate,
      tenantId: this.tenantId,
      customFields: this.transformDynamicProperties(order.dynamicProperties),
      orderNote: order.comment,
    };
  }

  /**
   * Transform multiple orders
   */
  toMcpOrders(orders: CustomerOrder[]): Order[] {
    return orders.map((order) => this.toMcpOrder(order));
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
   * Transform UpdateOrderInput to API payload
   */
  fromUpdateOrderInput(updates: UpdateOrderInput['updates']): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    const status = this.valueOrUndefined((updates as { status?: string | null | undefined }).status);
    if (status) {
      payload.status = this.reverseMapStatus(status);
    }

    const shippingAddress = this.valueOrUndefined(
      (updates as { shippingAddress?: Address | null }).shippingAddress
    );
    if (shippingAddress) {
      payload.shipping_address = this.addressTransformer.toFulfillmentAddress(shippingAddress);
    }

    const billingAddress = this.valueOrUndefined(
      (updates as { billingAddress?: Address | null }).billingAddress
    );
    if (billingAddress) {
      payload.billing_address = this.addressTransformer.toFulfillmentAddress(billingAddress);
    }

    const notes = this.valueOrUndefined((updates as { notes?: string | null }).notes);
    if (notes) {
      payload.notes = notes;
    }

    const tags = this.valueOrUndefined((updates as { tags?: string[] | null }).tags);
    if (Array.isArray(tags)) {
      payload.tags = tags;
    }

    return payload;
  }

  /**
   * Transform line item from VirtoCommerce format
   */
  private toOrderLineItem(orderId: string, item: LineItem, index: number): OrderLineItem {
    return {
      id: item.id ?? `${orderId}-${item.sku}-${index}`,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.extendedPrice ?? item.price * item.quantity,
      name: item.name,
    };
  }

  /**
   * Transform dynamic properties to custom fields
   */
  private transformDynamicProperties(
    properties?: CustomerOrder['dynamicProperties']
  ): CustomField[] | undefined {
    if (!properties?.length) {
      return undefined;
    }

    const entries = properties
      .filter((prop) => prop.values?.length)
      .map((prop) => ({
        name: prop.name,
        value: String(prop.values[0]?.value ?? ''),
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
    const reverse = Object.entries(STATUS_MAP).reduce<Record<string, string>>(
      (acc, [fulfillmentStatus, normalized]) => {
        acc[normalized] = fulfillmentStatus;
        return acc;
      },
      {}
    );

    return reverse[status] ?? status;
  }
}
