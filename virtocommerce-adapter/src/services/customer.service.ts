/**
 * Customer service - handles customer-related operations
 */

import type { Customer, FulfillmentToolResult, GetCustomersInput } from '@cof-org/mcp';
import type { YourFulfillmentCustomer } from '../types.js';
import type { Contact, MemberSearchCriteria } from '../models/index.js';
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

  /**
   * Get a customer by ID from VirtoCommerce
   */
  async getCustomerById(customerId: string): Promise<Contact | null> {
    if (!customerId) {
      return null;
    }

    try {
      // VirtoCommerce API: GET /api/members/{id}
      const response = await this.client.get<Contact>(`/api/members/${customerId}`);

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get multiple customers by IDs from VirtoCommerce
   */
  async getCustomersByIds(customerIds: string[]): Promise<Map<string, Contact>> {
    const customerMap = new Map<string, Contact>();

    if (!customerIds.length) {
      return customerMap;
    }

    // Remove duplicates
    const uniqueIds = [...new Set(customerIds.filter(Boolean))];

    try {
      // VirtoCommerce API: POST /api/members/search
      const searchCriteria: MemberSearchCriteria = {
        objectIds: uniqueIds,
        memberTypes: ['Contact'],
        take: uniqueIds.length,
        responseGroup: 'Full',
      };

      const response = await this.client.post<{ results?: Contact[] }>(
        '/api/members/search',
        searchCriteria
      );

      if (response.success && response.data?.results) {
        for (const contact of response.data.results) {
          if (contact.id) {
            customerMap.set(contact.id, contact);
          }
        }
      }
    } catch {
      // Return empty map on error - orders will use fallback data
    }

    return customerMap;
  }

  /**
   * Transform a VirtoCommerce Contact to MCP Customer
   */
  contactToMcpCustomer(contact: Contact): Customer {
    return this.transformer.fromContact(contact);
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
