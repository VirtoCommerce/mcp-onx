/**
 * Customer service - handles customer-related operations
 */

import type { Customer, FulfillmentToolResult, GetCustomersInput } from '@cof-org/mcp';
import type { YourFulfillmentCustomer } from '../types.js';
import { BaseService } from './base.service.js';
import { CustomerTransformer } from '../transformers/customer.transformer.js';
import { mapCustomerFilters } from '../mappers/filter.mappers.js';
import { getErrorMessage } from '../utils/type-guards.js';
import { ApiClient } from '../utils/api-client.js';

export class CustomerService extends BaseService {
  private transformer: CustomerTransformer;

  constructor(client: ApiClient, tenantId: string = 'default-workspace') {
    super(client);
    this.transformer = new CustomerTransformer(tenantId);
  }

  setTenantId(tenantId: string): void {
    this.transformer.setTenantId(tenantId);
  }

  async getCustomers(input: GetCustomersInput): Promise<FulfillmentToolResult<{ customers: Customer[] }>> {
    try {
      const response = await this.client.get<YourFulfillmentCustomer[] | YourFulfillmentCustomer>(
        '/customers',
        mapCustomerFilters(input)
      );

      if (!response.success) {
        return this.failure<{ customers: Customer[] }>(
          'Failed to fetch customers',
          response.error ?? response
        );
      }

      const customers = this.transformer.toMcpCustomers(this.ensureArray(response.data));
      return this.success<{ customers: Customer[] }>({ customers });
    } catch (error: unknown) {
      return this.failure<{ customers: Customer[] }>(
        `Customer lookup failed: ${getErrorMessage(error)}`,
        error
      );
    }
  }
}
