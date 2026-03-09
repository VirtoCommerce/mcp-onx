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
} from '@virtocommerce/cof-mcp';
import { STATUS_MAP, REVERSE_STATUS_MAP } from '../types.js';
import type {
  CustomerOrder,
  LineItem,
  Shipment,
  ShipmentItem,
  DynamicObjectProperty,
  Contact,
  PaymentIn,
  Address as VirtoAddress,
  Store,
} from '../models/index.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer, type CountryEntry } from './address.transformer.js';
import { CustomerTransformer } from './customer.transformer.js';

export interface CreateOrderEnrichment {
  defaultShippingAddress?: VirtoAddress;
  defaultBillingAddress?: VirtoAddress;
}

export class OrderTransformer extends BaseTransformer {
  private addressTransformer: AddressTransformer;
  private customerTransformer: CustomerTransformer;
  private workspace?: string;
  private catalogId?: string;
  private store?: Store;

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

  setCountries(countries: CountryEntry[]): void {
    this.addressTransformer.setCountries(countries);
  }

  setWorkspace(workspace: string): void {
    this.workspace = workspace;
  }

  setCatalogId(catalogId: string): void {
    this.catalogId = catalogId;
  }

  setStore(store: Store): void {
    this.store = store;
  }

  /**
   * Transform VirtoCommerce order to MCP Order format
   * @param order - The VirtoCommerce CustomerOrder
   * @param contact - Optional loaded Contact for the customer (if available)
   */
  toMcpOrder(order: CustomerOrder, contact?: Contact): Order {
    const shipment = order.shipments?.[0];

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
      shippingAddress: this.addressTransformer.toMcpAddress(shipment?.deliveryAddress),
      shippingCarrier: shipment?.shippingMethod?.name ?? shipment?.shipmentMethodCode,
      shippingClass: shipment?.shipmentMethodOption,
      shippingCode: shipment?.shipmentMethodCode,
      shippingPrice: shipment?.price,
      shippingNote: shipment?.comment,
      billingAddress: this.addressTransformer.toMcpAddress(this.findBillingAddress(order)),
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
    skuProductMap?: Map<string, { id: string; name: string; price?: number }>,
    enrichment?: CreateOrderEnrichment
  ): CustomerOrder {
    const order = input.order;
    if (!order) {
      return {};
    }

    const currency = order.currency ?? 'USD';

    // Use input addresses, fall back to enrichment defaults.
    // When copying Contact addresses, strip identity fields (key, id, outerId)
    // so VirtoCommerce creates new AddressEntity records instead of tracking duplicates.
    const shippingAddress = order.shippingAddress
      ? this.addressTransformer.toVirtoAddress(order.shippingAddress, 'Shipping')
      : enrichment?.defaultShippingAddress
        ? this.stripAddressIdentity(enrichment.defaultShippingAddress, 'Shipping')
        : undefined;

    const billingAddress = order.billingAddress
      ? this.addressTransformer.toVirtoAddress(order.billingAddress, 'Billing')
      : enrichment?.defaultBillingAddress
        ? this.stripAddressIdentity(enrichment.defaultBillingAddress, 'Billing')
        : undefined;

    const addresses = [shippingAddress, billingAddress].filter(
      (a): a is NonNullable<typeof a> => a !== undefined
    );

    const items: LineItem[] =
      order.lineItems?.map((item) => {
        const resolved = skuProductMap?.get(item.sku);
        const unitPrice = item.unitPrice ?? resolved?.price ?? 0;
        return {
          productId: resolved?.id,
          sku: item.sku,
          name: item.name ?? resolved?.name ?? item.sku,
          quantity: item.quantity ?? 0,
          price: unitPrice,
          placedPrice: unitPrice,
          currency,
          catalogId: this.catalogId,
        };
      }) ?? [];

    const hasShippingData =
      shippingAddress ||
      order.shippingCarrier ||
      order.shippingCode ||
      order.shippingClass ||
      order.shippingPrice !== undefined ||
      order.shippingNote ||
      order.giftNote;

    const commentParts = [order.giftNote, order.shippingNote].filter(Boolean);
    const shipmentComment = commentParts.length > 0 ? commentParts.join('\n').slice(0, 2048) : undefined;

    const shipmentItems: ShipmentItem[] = items.map((item) => ({
      lineItem: item,
      quantity: item.quantity,
    }));

    const shipments: Shipment[] = hasShippingData
      ? [
          {
            deliveryAddress: shippingAddress,
            shipmentMethodCode: order.shippingCode ?? order.shippingCarrier,
            shipmentMethodOption: order.shippingClass,
            price: order.shippingPrice,
            comment: shipmentComment,
            currency,
            items: shipmentItems,
          },
        ]
      : [];

    const customerName = order.customer
      ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ')
        || order.customer.email
        || order.customer.id
        || order.customer.externalId
      : undefined;

    // Build payment document
    // Note: PaymentIn.price is the payment method surcharge/fee, NOT the amount to be paid.
    // VirtoCommerce calculates total = subTotal + shippingTotal + paymentTotal,
    // so price must be 0 to avoid doubling the order total.
    const payment: PaymentIn = {
      currency,
      price: 0,
      sum: 0,
      paymentStatus: 'New',
      gatewayCode: 'DefaultManualPaymentMethod',
      paymentMethod: {
        code: 'DefaultManualPaymentMethod',
        name: 'Manual Payment',
        paymentMethodType: 0,
        isActive: true,
      },
      billingAddress,
      customerId: order.customer?.id ?? order.customer?.externalId,
      customerName,
      objectType: 'PaymentIn',
    };

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
      storeName: this.store?.name,
      comment: order.orderNote,
      items,
      addresses: addresses.length ? addresses : undefined,
      shipments: shipments.length ? shipments : undefined,
      inPayments: [payment],
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
      // Update or create shipment with delivery address
      if (updated.shipments?.length) {
        updated.shipments = updated.shipments.map((s, i) =>
          i === 0 ? { ...s, deliveryAddress: virtoShipping } : s
        );
      } else {
        updated.shipments = [{ deliveryAddress: virtoShipping, currency: updated.currency }];
      }
      // Also update in the order-level addresses array
      this.upsertAddress(updated, virtoShipping, 'Shipping');
    }

    const shippingCarrier = this.valueOrUndefined(
      (updates as { shippingCarrier?: string | null }).shippingCarrier
    );
    const shippingClass = this.valueOrUndefined(
      (updates as { shippingClass?: string | null }).shippingClass
    );
    const shippingCode = this.valueOrUndefined(
      (updates as { shippingCode?: string | null }).shippingCode
    );
    const shippingPrice = this.valueOrUndefined(
      (updates as { shippingPrice?: number | null }).shippingPrice
    );
    const shippingNote = this.valueOrUndefined(
      (updates as { shippingNote?: string | null }).shippingNote
    );
    const giftNote = this.valueOrUndefined((updates as { giftNote?: string | null }).giftNote);

    const hasShippingUpdates =
      shippingCarrier !== undefined ||
      shippingClass !== undefined ||
      shippingCode !== undefined ||
      shippingPrice !== undefined ||
      shippingNote !== undefined ||
      giftNote !== undefined;

    if (hasShippingUpdates) {
      if (!updated.shipments?.length) {
        updated.shipments = [{ currency: updated.currency }];
      }
      const s = { ...updated.shipments[0] };
      if (shippingCode !== undefined || shippingCarrier !== undefined) {
        s.shipmentMethodCode = shippingCode ?? shippingCarrier;
      }
      if (shippingClass !== undefined) { s.shipmentMethodOption = shippingClass; }
      if (shippingPrice !== undefined) { s.price = shippingPrice; }
      if (shippingNote !== undefined || giftNote !== undefined) {
        const parts = [giftNote ?? s.comment?.split('\n')[0], shippingNote].filter(Boolean);
        s.comment = parts.length ? parts.join('\n').slice(0, 2048) : undefined;
      }
      updated.shipments = [s, ...updated.shipments.slice(1)];
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
   * Create a copy of a VirtoCommerce address with identity fields removed.
   * Used when copying Contact default addresses into a new order to avoid
   * EF Core tracking conflicts (duplicate AddressEntity with same Id).
   */
  private stripAddressIdentity(
    address: VirtoAddress,
    addressType: 'Billing' | 'Shipping'
  ): VirtoAddress {
    const cleaned = { ...address, addressType };
    delete cleaned.key;
    delete cleaned.outerId;
    return cleaned;
  }

  /**
   * Upsert an address in the order's addresses array by type.
   * Replaces the first address of the given type, or appends if none found.
   */
  private upsertAddress(
    order: CustomerOrder,
    address: VirtoAddress,
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
   * Find the billing address for an order.
   * Priority: payment billingAddress → addresses array by type → undefined.
   */
  private findBillingAddress(order: CustomerOrder): VirtoAddress | undefined {
    // 1. Payment-level billing address (most explicit)
    const paymentBilling = order.inPayments?.[0]?.billingAddress;
    if (paymentBilling) {
      return paymentBilling;
    }

    // 2. Order-level addresses filtered by type
    const billingTypes = new Set(['Billing', 'BillingAndShipping']);
    return order.addresses?.find((a) => a.addressType && billingTypes.has(a.addressType));
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
