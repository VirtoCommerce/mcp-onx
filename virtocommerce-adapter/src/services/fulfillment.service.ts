/**
 * Fulfillment service - handles fulfillment/shipment-related operations
 */

import type {
  Fulfillment,
  FulfillmentToolResult,
  FulfillOrderInput,
  GetFulfillmentsInput,
} from '@cof-org/mcp';
import type { Shipment } from '../models/index.js';
import { BaseService } from './base.service.js';
import { FulfillmentTransformer } from '../transformers/fulfillment.transformer.js';
import { mapFulfillmentFiltersToSearchCriteria } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class FulfillmentService extends BaseService {
  private transformer: FulfillmentTransformer;

  constructor(client: ApiClient, tenantId: string = 'default-workspace') {
    super(client);
    this.transformer = new FulfillmentTransformer(tenantId);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  async fulfillOrder(
    input: FulfillOrderInput
  ): Promise<FulfillmentToolResult<{ fulfillment: Fulfillment }>> {
    if (!input.orderId) {
      return this.failure<{ fulfillment: Fulfillment }>('orderId is required to fulfill an order');
    }

    try {
      const response = await this.client.post<Shipment>(
        `/orders/${input.orderId}/shipments`,
        this.transformer.fromFulfillOrderInput(input)
      );

      if (!response.success || !response.data) {
        return this.failure<{ fulfillment: Fulfillment }>(
          'Failed to create fulfillment',
          response.error ?? response
        );
      }

      return this.success<{ fulfillment: Fulfillment }>({
        fulfillment: this.transformer.fromShipment(response.data),
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
      const searchCriteria = mapFulfillmentFiltersToSearchCriteria(input);

      const response = await this.client.post<{ results?: Shipment[]; totalCount?: number }>(
        '/api/order/customerOrders/shipments/search',
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
