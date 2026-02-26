/**
 * Address transformation utilities
 */

import type { Address, CustomerAddress } from '@virtocommerce/cof-mcp';
import type { YourFulfillmentAddress } from '../types.js';
import type { Address as VirtoAddress } from '../models/index.js';
import { BaseTransformer } from './base.js';

export class AddressTransformer extends BaseTransformer {
  /**
   * Transform MCP Address to VirtoCommerce address format
   */
  toFulfillmentAddress(address?: Address): YourFulfillmentAddress | undefined {
    if (!address) {
      return undefined;
    }

    return {
      street1: address.address1 ?? '',
      street2: address.address2,
      city: address.city ?? '',
      state: address.stateOrProvince ?? '',
      postal_code: address.zipCodeOrPostalCode ?? '',
      country: address.country ?? '',
      phone: address.phone,
      email: address.email,
      name: this.composeName(address.firstName, address.lastName),
      company: address.company,
    };
  }

  /**
   * Transform MCP Address to VirtoCommerce native Address format
   */
  toVirtoAddress(address: Address, addressType?: 'Billing' | 'Shipping'): VirtoAddress {
    return {
      addressType: addressType,
      firstName: address.firstName,
      lastName: address.lastName,
      name: this.composeName(address.firstName, address.lastName),
      organization: address.company,
      line1: address.address1,
      line2: address.address2,
      city: address.city,
      regionName: address.stateOrProvince,
      postalCode: address.zipCodeOrPostalCode,
      countryName: address.country,
      phone: address.phone,
      email: address.email,
    };
  }

  /**
   * Transform VirtoCommerce address to MCP Address format
   */
  toMcpAddress(address?: VirtoAddress): Address | undefined {
    if (!address) {
      return undefined;
    }

    const { firstName, lastName } = this.splitName(address.name);

    return {
      address1: address.line1 ?? '',
      address2: address.line2 ?? '',
      city: address.city ?? '',
      country: address.countryName ?? '',
      email: address.email,
      firstName,
      lastName,
      phone: address.phone,
      stateOrProvince: address.regionName ?? '',
      zipCodeOrPostalCode: address.postalCode ?? address.zip ?? '',
      company: address.organization,
    };
  }

  /**
   * Transform VirtoCommerce addresses to MCP CustomerAddress array
   */
  toCustomerAddresses(addresses?: VirtoAddress[]): CustomerAddress[] | undefined {
    if (!addresses?.length) {
      return undefined;
    }

    const mapped = addresses
      .map((addr) => {
        const address = this.toMcpAddress(addr);
        if (!address) {
          return undefined;
        }
        return {
          name: addr.name ?? this.composeName(address.firstName, address.lastName),
          address,
        };
      })
      .filter(Boolean) as CustomerAddress[];

    return mapped.length ? mapped : undefined;
  }
}
