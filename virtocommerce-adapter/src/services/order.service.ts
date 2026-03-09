/**
 * Order service - handles order-related operations
 */

import type {
  Order,
  OrderResult,
  FulfillmentToolResult,
  CreateSalesOrderInput,
  CancelOrderInput,
  UpdateOrderInput,
  GetOrdersInput,
} from '@virtocommerce/cof-mcp';
import type {
  CustomerOrder,
  CustomerOrderSearchResult,
  CustomerOrderSearchCriteria,
  Address as VirtoAddress,
  Store,
} from '../models/index.js';
import { BaseService } from './base.service.js';
import { OrderTransformer } from '../transformers/order.transformer.js';
import type { CountryEntry } from '../transformers/address.transformer.js';
import { CustomerService } from './customer.service.js';
import { mapOrderFiltersToSearchCriteria } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';
import { ProductService } from './product.service.js';

export class OrderService extends BaseService {
  private transformer: OrderTransformer;
  private customerService: CustomerService;
  private productService?: ProductService;
  private workspace?: string;

  constructor(
    client: ApiClient,
    tenantId: string = 'default-workspace',
    workspace?: string,
    customerService?: CustomerService
  ) {
    super(client);
    this.workspace = workspace;
    this.transformer = new OrderTransformer(tenantId, workspace);
    this.customerService = customerService ?? new CustomerService(client, tenantId);
  }

  setProductService(productService: ProductService): void {
    this.productService = productService;
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  setWorkspace(workspace: string): void {
    this.workspace = workspace;
    this.transformer.setWorkspace(workspace);
  }

  setCatalogId(catalogId: string): void {
    this.transformer.setCatalogId(catalogId);
  }

  setStore(store: Store): void {
    this.transformer.setStore(store);
  }

  setCountries(countries: CountryEntry[]): void {
    this.transformer.setCountries(countries);
  }

  async createSalesOrder(input: CreateSalesOrderInput): Promise<OrderResult> {
    try {
      // VirtoCommerce requires customer identification on orders
      const customer = input.order?.customer;
      if (!customer?.id && !customer?.externalId) {
        return this.failure<{ order: Order }>(
          'Customer identification is required to create an order. Provide customer.id or customer.externalId in order.customer.'
        );
      }

      // Enrich customer data from VirtoCommerce if only ID was provided
      const customerId = customer.id ?? customer.externalId;
      let defaultShippingAddress: VirtoAddress | undefined;
      let defaultBillingAddress: VirtoAddress | undefined;

      if (customerId && this.customerService) {
        const contact = await this.customerService.getCustomerById(customerId);
        if (contact) {
          const enriched = input.order!.customer!;
          enriched.firstName = enriched.firstName || contact.firstName;
          enriched.lastName = enriched.lastName || contact.lastName;
          enriched.email = enriched.email || contact.emails?.[0];
          enriched.phone = enriched.phone || contact.phones?.[0];

          // Extract default addresses from Contact
          if (contact.addresses?.length) {
            defaultShippingAddress = contact.defaultShippingAddressId
              ? contact.addresses.find((a) => a.key === contact.defaultShippingAddressId)
              : contact.addresses.find((a) => a.addressType === 'Shipping' || a.addressType === 'BillingAndShipping');

            defaultBillingAddress = contact.defaultBillingAddressId
              ? contact.addresses.find((a) => a.key === contact.defaultBillingAddressId)
              : contact.addresses.find((a) => a.addressType === 'Billing' || a.addressType === 'BillingAndShipping');
          }
        }
      }

      // Resolve SKUs to product info (id + name + price) before building the payload
      const skus = input.order?.lineItems?.map((li) => li.sku).filter(Boolean) as string[] ?? [];
      const skuProductMap = skus.length && this.productService
        ? await this.productService.resolveSkuProductMap(skus, {
            currency: input.order?.currency ?? 'USD',
            customerId,
          })
        : new Map<string, { id: string; name: string; price?: number }>();

      console.error(`[OrderService] Resolved SKUs to products: ${JSON.stringify(Object.fromEntries(skuProductMap))}`);

      const payload = this.transformer.fromCreateSalesOrderInput(input, skuProductMap, {
        defaultShippingAddress,
        defaultBillingAddress,
      });
      const response = await this.client.post<CustomerOrder>('/api/order/customerOrders', payload);

      if (!response.success || !response.data) {
        return this.failure<{ order: Order }>('Failed to create order', response.error ?? response);
      }

      return this.success<{ order: Order }>({
        order: this.transformer.toMcpOrder(response.data),
      });
    } catch (error: unknown) {
      return this.failure<{ order: Order }>(`Order creation failed: ${getErrorMessage(error)}`, error);
    }
  }

  async cancelOrder(input: CancelOrderInput): Promise<OrderResult> {
    if (!input.orderId) {
      return this.failure<{ order: Order }>('orderId is required to cancel an order');
    }

    try {
      // Fetch the current order
      const fetchResponse = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${input.orderId}`
      );

      if (!fetchResponse.success || !fetchResponse.data) {
        return this.failure<{ order: Order }>('Order not found', {
          orderId: input.orderId,
          error: fetchResponse.error,
        });
      }

      const order = fetchResponse.data;

      // Check if already cancelled
      if (order.isCancelled) {
        return this.failure<{ order: Order }>('Order is already cancelled', {
          orderId: input.orderId,
          cancelledDate: order.cancelledDate,
        });
      }

      // Update the order with cancellation fields
      const cancelledOrder: CustomerOrder = {
        ...order,
        isCancelled: true,
        cancelledDate: new Date().toISOString(),
        cancelReason: input.reason ?? 'Customer requested cancellation',
        cancelledState: 'Requested',
        status: 'Cancelled',
        comment: input.notes
          ? `${order.comment ?? ''}\n[Cancellation] ${input.notes}`.trim().slice(0, 2048)
          : order.comment,
      };

      // Save the updated order (PUT returns 204 No Content)
      const saveResponse = await this.client.put<CustomerOrder>(
        '/api/order/customerOrders',
        cancelledOrder
      );

      if (!saveResponse.success) {
        return this.failure<{ order: Order }>('Failed to cancel order', saveResponse.error ?? saveResponse);
      }

      // Fetch the saved order to get server-recalculated totals
      const refetchResponse = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${input.orderId}`
      );

      const savedOrder = refetchResponse.success && refetchResponse.data
        ? refetchResponse.data
        : cancelledOrder;

      return this.success<{ order: Order }>({
        order: this.transformer.toMcpOrder(savedOrder),
      });
    } catch (error: unknown) {
      return this.failure<{ order: Order }>(
        `Order cancellation failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  async updateOrder(input: UpdateOrderInput): Promise<OrderResult> {
    if (!input.id) {
      return this.failure<{ order: Order }>('id is required to update an order');
    }

    try {
      // Step 1: Fetch the current order
      const fetchResponse = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${input.id}`
      );

      if (!fetchResponse.success || !fetchResponse.data) {
        return this.failure<{ order: Order }>('Order not found', {
          orderId: input.id,
          error: fetchResponse.error,
        });
      }

      // Step 2: Apply updates to the VirtoCommerce order object
      const updatedOrder = this.transformer.applyUpdatesToOrder(
        fetchResponse.data,
        input.updates
      );

      // Step 3: Save the updated order (PUT returns 204 No Content)
      const saveResponse = await this.client.put<CustomerOrder>(
        '/api/order/customerOrders',
        updatedOrder
      );

      if (!saveResponse.success) {
        return this.failure<{ order: Order }>('Failed to update order', saveResponse.error ?? saveResponse);
      }

      // Fetch the saved order to get server-recalculated totals
      const refetchResponse = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${input.id}`
      );

      const savedOrder = refetchResponse.success && refetchResponse.data
        ? refetchResponse.data
        : updatedOrder;

      return this.success<{ order: Order }>({
        order: this.transformer.toMcpOrder(savedOrder),
      });
    } catch (error: unknown) {
      return this.failure<{ order: Order }>(`Order update failed: ${getErrorMessage(error)}`, error);
    }
  }

  async getOrders(input: GetOrdersInput): Promise<FulfillmentToolResult<{ orders: Order[] }>> {
    try {
      // Build VirtoCommerce search criteria from input
      const searchCriteria: CustomerOrderSearchCriteria = mapOrderFiltersToSearchCriteria(input);

      // Filter by store when workspace is configured
      if (this.workspace) {
        searchCriteria.storeIds = [this.workspace];
      }

      const response = await this.client.post<CustomerOrderSearchResult>(
        '/api/order/customerOrders/search',
        searchCriteria
      );

      if (!response.success) {
        return this.failure<{ orders: Order[] }>('Failed to fetch orders', response.error ?? response);
      }

      const results = (response.data as CustomerOrderSearchResult)?.results ?? [];

      // Extract unique customer IDs from orders
      const customerIds = results
        .map((order) => order.customerId)
        .filter((id): id is string => !!id);

      // Load customers by IDs
      const customerMap = await this.customerService.getCustomersByIds(customerIds);

      // Transform orders with loaded customer data
      const orders = this.transformer.toMcpOrders(results, customerMap);
      return this.success<{ orders: Order[] }>({ orders });
    } catch (error: unknown) {
      return this.failure<{ orders: Order[] }>(`Order lookup failed: ${getErrorMessage(error)}`, error);
    }
  }

}
