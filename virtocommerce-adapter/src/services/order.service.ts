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
} from '@cof-org/mcp';
import type { YourFulfillmentOrder, YourFulfillmentApiResponse } from '../types.js';
import type { CustomerOrder, CustomerOrderSearchResult } from '../models/customer-order.js';
import { BaseService } from './base.service.js';
import { OrderTransformer } from '../transformers/order.transformer.js';
import { mapOrderFilters } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class OrderService extends BaseService {
  private transformer: OrderTransformer;

  constructor(client: ApiClient, tenantId: string = 'default-workspace', workspace?: string) {
    super(client);
    this.transformer = new OrderTransformer(tenantId, workspace);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  setWorkspace(workspace: string): void {
    this.transformer.setWorkspace(workspace);
  }

  async createSalesOrder(input: CreateSalesOrderInput): Promise<OrderResult> {
    try {
      const payload = this.transformer.fromCreateSalesOrderInput(input);
      const response = await this.client.post<YourFulfillmentOrder>('/orders', payload);

      if (!response.success || !response.data) {
        return this.failure<{ order: Order }>('Failed to create order', response.error ?? response);
      }

      return this.success<{ order: Order }>({
        order: this.transformer.toMcpOrder(response.data as unknown as CustomerOrder),
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
      const response = await this.client.post<YourFulfillmentOrder>(`/orders/${input.orderId}/cancel`, {
        reason: input.reason ?? 'Customer requested cancellation',
        notify_customer: input.notifyCustomer ?? false,
        notes: input.notes,
        cancelled_at: new Date().toISOString(),
      });

      if (!response.success) {
        return this.failure<{ order: Order }>('Failed to cancel order', response.error ?? response);
      }

      const orderData = response.data ?? (await this.fetchOrderById(input.orderId)).data;

      if (!orderData) {
        return this.failure<{ order: Order }>('Order not found after cancellation', {
          orderId: input.orderId,
        });
      }

      return this.success<{ order: Order }>({
        order: this.transformer.toMcpOrder(orderData as unknown as CustomerOrder),
      });
    } catch (error: unknown) {
      return this.failure<{ order: Order }>(
        `Order cancellation failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  async updateOrder(input: UpdateOrderInput): Promise<OrderResult> {
    try {
      const response = await this.client.patch<YourFulfillmentOrder>(
        `/orders/${input.id}`,
        this.transformer.fromUpdateOrderInput(input.updates)
      );

      if (!response.success) {
        return this.failure<{ order: Order }>('Failed to update order', response.error ?? response);
      }

      const orderData = response.data ?? (await this.fetchOrderById(input.id)).data;

      if (!orderData) {
        return this.failure<{ order: Order }>('Order not found after update', { orderId: input.id });
      }

      return this.success<{ order: Order }>({
        order: this.transformer.toMcpOrder(orderData as unknown as CustomerOrder),
      });
    } catch (error: unknown) {
      return this.failure<{ order: Order }>(`Order update failed: ${getErrorMessage(error)}`, error);
    }
  }

  async getOrders(input: GetOrdersInput): Promise<FulfillmentToolResult<{ orders: Order[] }>> {
    try {
      const response = await this.client.post<CustomerOrderSearchResult>(
        '/api/order/customerOrders/search',
        {},
        mapOrderFilters(input)
      );

      if (!response.success) {
        return this.failure<{ orders: Order[] }>('Failed to fetch orders', response.error ?? response);
      }

      const results = (response.data as CustomerOrderSearchResult)?.results ?? [];
      const orders = this.transformer.toMcpOrders(results);
      return this.success<{ orders: Order[] }>({ orders });
    } catch (error: unknown) {
      return this.failure<{ orders: Order[] }>(`Order lookup failed: ${getErrorMessage(error)}`, error);
    }
  }

  private async fetchOrderById(orderId: string): Promise<YourFulfillmentApiResponse<YourFulfillmentOrder>> {
    return this.client.get<YourFulfillmentOrder>(`/orders/${orderId}`);
  }
}
