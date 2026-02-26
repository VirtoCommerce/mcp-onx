/**
 * Customer transformation utilities
 */

import type { Customer } from '@virtocommerce/cof-mcp';
import type { YourFulfillmentCustomer } from '../types.js';
import type { CustomerOrder, Contact, Address } from '../models/index.js';
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
   * Transform VirtoCommerce Contact to MCP Customer
   */
  fromContact(contact: Contact): Customer {
    // Get primary email from emails array
    const primaryEmail = contact.emails?.[0];

    // Get primary phone from phones array
    const primaryPhone = contact.phones?.[0];

    // Transform addresses
    const addresses = this.addressTransformer.toCustomerAddresses(
      contact.addresses as Address[] | undefined
    );

    return {
      id: contact.id ?? '',
      externalId: contact.outerId,
      firstName: contact.firstName ?? '',
      lastName: contact.lastName ?? '',
      email: primaryEmail,
      phone: primaryPhone,
      addresses,
      tags: contact.groups,
      createdAt: contact.createdDate ?? this.now(),
      updatedAt: contact.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
      status: contact.status ?? 'active',
      type: 'customer',
      customFields: this.extractCustomFields(contact),
    };
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
   * Create a minimal customer from order data (fallback when customer not found)
   */
  fromOrder(order: CustomerOrder): Customer {
    return {
      id: order.customerId ?? '',
      firstName: '',
      lastName: order.customerName ?? '',
      email: undefined,
      phone: undefined,
      addresses: this.addressTransformer.toCustomerAddresses(
        order.addresses as Address[] | undefined
      ),
      tags: [],
      createdAt: order.createdDate ?? this.now(),
      updatedAt: order.modifiedDate ?? this.now(),
      tenantId: this.tenantId,
      status: 'active',
      type: 'customer',
    };
  }

  /**
   * Transform multiple customers
   */
  toMcpCustomers(customers: YourFulfillmentCustomer[]): Customer[] {
    return customers.map((customer) => this.toMcpCustomer(customer));
  }

  /**
   * Transform multiple VirtoCommerce contacts to MCP Customers
   */
  fromContacts(contacts: Contact[]): Customer[] {
    return contacts.map((contact) => this.fromContact(contact));
  }

  /**
   * Extract custom fields from contact's dynamic properties
   */
  private extractCustomFields(contact: Contact): { name: string; value: string }[] | undefined {
    if (!contact.dynamicProperties?.length) {
      return undefined;
    }

    const fields = contact.dynamicProperties
      .filter((prop) => prop.values?.length)
      .map((prop) => ({
        name: prop.name ?? '',
        value: String(prop.values?.[0]?.value ?? ''),
      }));

    return fields.length ? fields : undefined;
  }
}
