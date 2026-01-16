/**
 * Return service - handles return-related operations
 */

import type {
  Return,
  ReturnResult,
  FulfillmentToolResult,
  CreateReturnInput,
  GetReturnsInput,
} from '@cof-org/mcp';
import { BaseService } from './base.service.js';
import { mapReturnFilters } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class ReturnService extends BaseService {
  constructor(client: ApiClient) {
    super(client);
  }

  async createReturn(input: CreateReturnInput): Promise<ReturnResult> {
    try {
      const payload = {
        order_id: input.return.orderId,
        return_number: input.return.returnNumber,
        status: input.return.status,
        outcome: input.return.outcome,
        items: input.return.returnLineItems?.map((item) => ({
          sku: item.sku,
          quantity: item.quantityReturned,
          reason: item.returnReason,
          refund_amount: item.refundAmount,
        })),
      };

      const response = await this.client.post('/returns', payload);

      if (!response.success || !response.data) {
        return this.failure<{ return: Return }>('Failed to create return', response.error ?? response);
      }

      // TODO: Transform the response to Return type when VirtoCommerce return API is defined
      return this.failure<{ return: Return }>(
        'createReturn not yet implemented - please implement transformation logic'
      );
    } catch (error: unknown) {
      return this.failure<{ return: Return }>(
        `Return creation failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  async getReturns(input: GetReturnsInput): Promise<FulfillmentToolResult<{ returns: Return[] }>> {
    try {
      const response = await this.client.get('/returns', mapReturnFilters(input));

      if (!response.success) {
        return this.failure<{ returns: Return[] }>(
          'Failed to fetch returns',
          response.error ?? response
        );
      }

      // TODO: Transform the response to Return[] type when VirtoCommerce return API is defined
      return this.failure<{ returns: Return[] }>(
        'getReturns not yet implemented - please implement transformation logic'
      );
    } catch (error: unknown) {
      return this.failure<{ returns: Return[] }>(
        `Return lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }
}
