/**
 * Fulfillment service - handles fulfillment/shipment-related operations
 */

import type {
  Fulfillment,
  FulfillmentToolResult,
  FulfillOrderInput,
  GetFulfillmentsInput,
} from '@virtocommerce/cof-mcp';
import type { Shipment, CustomerOrder } from '../models/index.js';
import { BaseService } from './base.service.js';
import { FulfillmentTransformer } from '../transformers/fulfillment.transformer.js';
import type { CountryEntry } from '../transformers/address.transformer.js';
import { mapFulfillmentFiltersToSearchCriteria } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class FulfillmentService extends BaseService {
  private transformer: FulfillmentTransformer;
  private workspace?: string;

  constructor(client: ApiClient, tenantId: string = 'default-workspace', workspace?: string) {
    super(client);
    this.workspace = workspace;
    this.transformer = new FulfillmentTransformer(tenantId);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  setWorkspace(workspace: string): void {
    this.workspace = workspace;
  }

  setCountries(countries: CountryEntry[]): void {
    this.transformer.setCountries(countries);
  }

  async fulfillOrder(
    input: FulfillOrderInput
  ): Promise<FulfillmentToolResult<{ fulfillment: Fulfillment }>> {
    if (!input.orderId) {
      return this.failure<{ fulfillment: Fulfillment }>('orderId is required to fulfill an order');
    }

    try {
      // Step 1: Fetch the current order
      const fetchResponse = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${input.orderId}`
      );

      if (!fetchResponse.success || !fetchResponse.data) {
        return this.failure<{ fulfillment: Fulfillment }>('Order not found', {
          orderId: input.orderId,
          error: fetchResponse.error,
        });
      }

      const order = fetchResponse.data;
      const existingShipmentIds = new Set((order.shipments ?? []).map((s) => s.id));

      // Step 2: Build a Shipment from input, resolving SKUs to lineItemIds
      const newShipment = this.transformer.fromFulfillOrderInput(input, order.items, order.currency);

      // Step 3: Add the shipment to the order
      const updatedOrder: CustomerOrder = {
        ...order,
        shipments: [...(order.shipments ?? []), newShipment],
      };

      // Step 4: Save the updated order (PUT returns 204 No Content)
      const saveResponse = await this.client.put<CustomerOrder>(
        '/api/order/customerOrders',
        updatedOrder
      );

      if (!saveResponse.success) {
        return this.failure<{ fulfillment: Fulfillment }>(
          'Failed to create fulfillment',
          saveResponse.error ?? saveResponse
        );
      }

      // Step 5: Fetch the saved order to get server-assigned id/number for the new shipment
      const refetchResponse = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${input.orderId}`
      );

      const savedShipments = refetchResponse.success && refetchResponse.data
        ? refetchResponse.data.shipments ?? []
        : updatedOrder.shipments ?? [];

      // Find the newly added shipment — the one not present in the original order
      const addedShipment =
        savedShipments.find((s) => s.id && !existingShipmentIds.has(s.id)) ??
        savedShipments[savedShipments.length - 1];

      if (!addedShipment) {
        return this.failure<{ fulfillment: Fulfillment }>(
          'Shipment was saved but could not be retrieved from order'
        );
      }

      return this.success<{ fulfillment: Fulfillment }>({
        fulfillment: this.transformer.fromShipment(addedShipment),
      });
    } catch (error: unknown) {
      return this.failure<{ fulfillment: Fulfillment }>(
        `Fulfillment failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  async getFulfillments(
    input: GetFulfillmentsInput
  ): Promise<FulfillmentToolResult<{ fulfillments: Fulfillment[] }>> {
    try {
      // VC ShipmentSearchCriteria supports single orderId only,
      // so we run a separate request per orderId and merge results
      if (input.orderIds && input.orderIds.length > 1) {
        const allShipments: Shipment[] = [];

        for (const orderId of input.orderIds) {
          const perOrderInput = { ...input, orderIds: [orderId] };
          const searchCriteria = mapFulfillmentFiltersToSearchCriteria(perOrderInput);

          // Filter by store when workspace is configured
          if (this.workspace) {
            searchCriteria.storeIds = [this.workspace];
          }

          const response = await this.client.post<{ results?: Shipment[]; totalCount?: number }>(
            '/api/order/shipments/search',
            searchCriteria
          );

          if (response.success) {
            allShipments.push(...(response.data?.results ?? []));
          }
        }

        const fulfillments = this.transformer.fromShipments(allShipments);
        return this.success<{ fulfillments: Fulfillment[] }>({ fulfillments });
      }

      const searchCriteria = mapFulfillmentFiltersToSearchCriteria(input);

      // Filter by store when workspace is configured
      if (this.workspace) {
        searchCriteria.storeIds = [this.workspace];
      }

      const response = await this.client.post<{ results?: Shipment[]; totalCount?: number }>(
        '/api/order/shipments/search',
        searchCriteria
      );

      if (!response.success) {
        return this.failure<{ fulfillments: Fulfillment[] }>(
          'Failed to fetch fulfillments',
          response.error ?? response
        );
      }

      const shipments = response.data?.results ?? [];
      const fulfillments = this.transformer.fromShipments(shipments);
      return this.success<{ fulfillments: Fulfillment[] }>({ fulfillments });
    } catch (error: unknown) {
      return this.failure<{ fulfillments: Fulfillment[] }>(
        `Fulfillment lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }
}
