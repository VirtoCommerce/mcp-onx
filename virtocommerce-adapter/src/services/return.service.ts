/**
 * Return service - handles return-related operations against VirtoCommerce Return Module API
 *
 * Endpoints used:
 * - PUT  /api/return/           — Create/Update (SaveChanges pattern)
 * - POST /api/return/search     — Search with ReturnSearchCriteria
 * - GET  /api/return/{id}       — Get by ID
 * - GET  /api/order/customerOrders/{id} — Fetch order for SKU resolution
 */

import type {
  Return,
  ReturnResult,
  FulfillmentToolResult,
  CreateReturnInput,
  GetReturnsInput,
} from '@virtocommerce/cof-mcp';
import type { VcReturn, CustomerOrder, ReturnSearchResult } from '../models/index.js';
import { BaseService } from './base.service.js';
import { ReturnTransformer } from '../transformers/return.transformer.js';
import { mapReturnFiltersToSearchCriteria } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class ReturnService extends BaseService {
  private transformer: ReturnTransformer;

  constructor(client: ApiClient, tenantId: string = 'default-workspace') {
    super(client);
    this.transformer = new ReturnTransformer(tenantId);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  async createReturn(input: CreateReturnInput): Promise<ReturnResult> {
    try {
      // Step 1: Validate orderId is present
      if (!input.return.orderId) {
        return this.failure<{ return: Return }>('orderId is required to create a return');
      }

      // Step 2: Fetch the order for line item resolution and price fallback
      const order = await this.fetchOrder(input.return.orderId);
      if (!order) {
        return this.failure<{ return: Return }>(
          `Order not found: ${input.return.orderId}`
        );
      }

      // Step 3: Transform MCP input to VC Return payload
      const vcReturn = this.transformer.fromCreateReturnInput(input, order);

      // Step 4: Save via PUT /api/return/ (returns the saved entity with id)
      const saveResponse = await this.client.put<VcReturn>('/api/return/', vcReturn);

      if (!saveResponse.success || !saveResponse.data) {
        return this.failure<{ return: Return }>(
          'Failed to create return',
          saveResponse.error ?? saveResponse
        );
      }

      // Step 5: Extract the ID from the response
      const savedId = saveResponse.data.id;
      if (!savedId) {
        return this.failure<{ return: Return }>(
          'Return was saved but no ID was returned'
        );
      }

      // Step 6: Fetch the created return to get the full server-generated data
      const created = await this.fetchReturnById(savedId);
      if (!created) {
        // Fallback: use the save response directly
        const mcpReturn = this.transformer.toMcpReturn(saveResponse.data, order);
        return this.success<{ return: Return }>({ return: mcpReturn });
      }

      // Step 7: Transform and return
      const mcpReturn = this.transformer.toMcpReturn(created, order);
      return this.success<{ return: Return }>({ return: mcpReturn });
    } catch (error: unknown) {
      return this.failure<{ return: Return }>(
        `Return creation failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  async getReturns(input: GetReturnsInput): Promise<FulfillmentToolResult<{ returns: Return[] }>> {
    try {
      // When multiple orderIds are provided, loop per orderId (VC supports single orderId)
      if (input.orderIds && input.orderIds.length > 1) {
        const allReturns: VcReturn[] = [];

        for (const orderId of input.orderIds) {
          const perOrderInput = { ...input, orderIds: [orderId] };
          const searchCriteria = mapReturnFiltersToSearchCriteria(perOrderInput);

          const response = await this.client.post<ReturnSearchResult>(
            '/api/return/search',
            searchCriteria
          );

          if (response.success && response.data?.results) {
            allReturns.push(...response.data.results);
          }
        }

        return this.transformAndReturn(allReturns, input);
      }

      // Standard single-request path
      const searchCriteria = mapReturnFiltersToSearchCriteria(input);

      const response = await this.client.post<ReturnSearchResult>(
        '/api/return/search',
        searchCriteria
      );

      if (!response.success) {
        return this.failure<{ returns: Return[] }>(
          'Failed to fetch returns',
          response.error ?? response
        );
      }

      const vcReturns = response.data?.results ?? [];
      return this.transformAndReturn(vcReturns, input);
    } catch (error: unknown) {
      return this.failure<{ returns: Return[] }>(
        `Return lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  /**
   * Post-filter, resolve orders for SKU enrichment, transform, and return
   */
  private async transformAndReturn(
    vcReturns: VcReturn[],
    input: GetReturnsInput
  ): Promise<FulfillmentToolResult<{ returns: Return[] }>> {
    // Apply client-side post-filters
    let filtered = this.applyPostFilters(vcReturns, input);

    // Apply client-side pagination only when post-filtering was needed
    // (otherwise the API already handled skip/take correctly)
    if (this.needsPostFilter(input)) {
      const pageSize = input.pageSize ?? 20;
      const skip = input.skip ?? 0;
      filtered = filtered.slice(skip, skip + pageSize);
    }

    // Collect unique orderIds for SKU resolution
    const orderIds = new Set<string>();
    for (const vcReturn of filtered) {
      if (vcReturn.orderId) {
        orderIds.add(vcReturn.orderId);
      }
    }

    // Fetch orders for SKU/name enrichment
    const orderMap = new Map<string, CustomerOrder>();
    for (const orderId of orderIds) {
      const order = await this.fetchOrder(orderId);
      if (order) {
        orderMap.set(orderId, order);
      }
    }

    const returns = this.transformer.toMcpReturns(filtered, orderMap);
    return this.success<{ returns: Return[] }>({ returns });
  }

  /**
   * Apply client-side filters that VC Return search doesn't support
   */
  private applyPostFilters(vcReturns: VcReturn[], input: GetReturnsInput): VcReturn[] {
    let results = vcReturns;

    // Filter by statuses (VC uses PascalCase, input may use MCP lowercase)
    if (input.statuses?.length) {
      const statusSet = new Set(input.statuses.map((s) => s.toLowerCase()));
      results = results.filter((r) => {
        const normalized = (r.status ?? '').toLowerCase();
        return statusSet.has(normalized);
      });
    }

    // Filter by outcomes/resolution
    if (input.outcomes?.length) {
      const outcomeSet = new Set(input.outcomes.map((o) => o.toLowerCase()));
      results = results.filter((r) => {
        const normalized = (r.resolution ?? '').toLowerCase();
        return outcomeSet.has(normalized);
      });
    }

    // Exact match on return numbers (keyword search is partial)
    if (input.returnNumbers?.length) {
      const numberSet = new Set(input.returnNumbers);
      results = results.filter((r) => r.number && numberSet.has(r.number));
    }

    // Temporal filters
    if (input.createdAtMin) {
      const min = new Date(input.createdAtMin).getTime();
      results = results.filter((r) => r.createdDate && new Date(r.createdDate).getTime() >= min);
    }
    if (input.createdAtMax) {
      const max = new Date(input.createdAtMax).getTime();
      results = results.filter((r) => r.createdDate && new Date(r.createdDate).getTime() <= max);
    }
    if (input.updatedAtMin) {
      const min = new Date(input.updatedAtMin).getTime();
      results = results.filter((r) => r.modifiedDate && new Date(r.modifiedDate).getTime() >= min);
    }
    if (input.updatedAtMax) {
      const max = new Date(input.updatedAtMax).getTime();
      results = results.filter((r) => r.modifiedDate && new Date(r.modifiedDate).getTime() <= max);
    }

    return results;
  }

  /**
   * Determine whether client-side post-filtering is needed for the given input.
   * Mirrors the logic in mapReturnFiltersToSearchCriteria.
   */
  private needsPostFilter(input: GetReturnsInput): boolean {
    return !!(
      input.statuses?.length ||
      input.outcomes?.length ||
      (input.returnNumbers && input.returnNumbers.length > 1) ||
      input.createdAtMin ||
      input.createdAtMax ||
      input.updatedAtMin ||
      input.updatedAtMax
    );
  }

  /**
   * Fetch a single order by ID for SKU/name resolution
   */
  private async fetchOrder(orderId: string): Promise<CustomerOrder | null> {
    try {
      const response = await this.client.get<CustomerOrder>(
        `/api/order/customerOrders/${orderId}`
      );
      return response.success && response.data ? response.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch a single return by ID
   */
  private async fetchReturnById(returnId: string): Promise<VcReturn | null> {
    try {
      const response = await this.client.get<VcReturn>(`/api/return/${returnId}`);
      return response.success && response.data ? response.data : null;
    } catch {
      return null;
    }
  }
}
