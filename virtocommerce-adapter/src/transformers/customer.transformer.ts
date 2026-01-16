/**
 * Customer transformation utilities
 */

import type { Customer } from '@cof-org/mcp';
import type { YourFulfillmentCustomer, YourFulfillmentAddress } from '../types.js';
import type { CustomerOrder } from '../models/customer-order.js';
import { BaseTransformer } from './base.js';
import { AddressTransformer } from './address.transformer.js';

export class CustomerTransformer extends BaseTransformer {
  private addressTransformer: AddressTransformer;

  constructor(tenantId: string = 'default-workspace') {
    super(tenantId);
    this.addressTransformer = new AddressTransformer(tenantId);
  }

  override setTenantId(tenantId: string): void {
    super.setTenantId(tenantId);
    this.addressTransformer.setTenantId(tenantId);
  }

  /**
   * Transform YourFulfillment customer format to MCP Customer
   */
  toMcpCustomer(customer: YourFulfillmentCustomer): Customer {
    return {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      addresses: this.addressTransformer.toCustomerAddresses(customer.addresses as any),
      tags: customer.tags,
      createdAt: customer.created_at ?? this.now(),
      updatedAt: customer.updated_at ?? this.now(),
      tenantId: this.tenantId,
      status: 'active',
      type: 'customer',
    };
  }

  /**
   * Extract and transform customer from VirtoCommerce order
   */
  fromOrder(order: CustomerOrder): Customer {
    const customerData: YourFulfillmentCustomer = {
      id: order.customerId,
      email: order.customerName, // Using customerName as email fallback
      first_name: '',
      last_name: order.customerName,
      phone: undefined,
      created_at: order.createdDate,
      updated_at: order.modifiedDate,
      addresses: order.addresses as unknown as YourFulfillmentAddress[],
      tags: [],
      metadata: {},
    };

    return this.toMcpCustomer(customerData);
  }

  /**
   * Transform multiple customers
   */
  toMcpCustomers(customers: YourFulfillmentCustomer[]): Customer[] {
    return customers.map((customer) => this.toMcpCustomer(customer));
  }
}
