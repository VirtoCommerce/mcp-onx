/**
 * Fulfillment service - handles fulfillment/shipment-related operations
 */

import type {
  Fulfillment,
  FulfillmentToolResult,
  FulfillOrderInput,
  GetFulfillmentsInput,
} from '@cof-org/mcp';
import type { YourFulfillmentShipment } from '../types.js';
import { BaseService } from './base.service.js';
import { FulfillmentTransformer } from '../transformers/fulfillment.transformer.js';
import { mapFulfillmentFilters } from '../mappers/filter.mappers.js';
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
      const response = await this.client.post<YourFulfillmentShipment>(
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
        fulfillment: this.transformer.toMcpFulfillment(response.data),
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
      const response = await this.client.get<YourFulfillmentShipment[] | YourFulfillmentShipment>(
        '/shipments',
        mapFulfillmentFilters(input)
      );

      if (!response.success) {
        return this.failure<{ fulfillments: Fulfillment[] }>(
          'Failed to fetch fulfillments',
          response.error ?? response
        );
      }

      const fulfillments = this.transformer.toMcpFulfillments(this.ensureArray(response.data));
      return this.success<{ fulfillments: Fulfillment[] }>({ fulfillments });
    } catch (error: unknown) {
      return this.failure<{ fulfillments: Fulfillment[] }>(
        `Fulfillment lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }
}
