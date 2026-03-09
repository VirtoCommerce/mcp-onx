/**
 * Address transformation utilities
 */

import type { Address, CustomerAddress } from '@virtocommerce/cof-mcp';
import type { Address as VirtoAddress } from '../models/index.js';
import { BaseTransformer } from './base.js';

export interface CountryEntry {
  id: string;   // country code, e.g. "US"
  name: string; // country name, e.g. "United States"
}

export class AddressTransformer extends BaseTransformer {
  private codeToName = new Map<string, string>();
  private nameToCode = new Map<string, string>();

  /**
   * Load country list from VirtoCommerce /api/platform/common/countries.
   * Builds bidirectional lookup maps (code↔name).
   */
  setCountries(countries: CountryEntry[]): void {
    this.codeToName.clear();
    this.nameToCode.clear();
    for (const c of countries) {
      if (c.id && c.name) {
        this.codeToName.set(c.id.toUpperCase(), c.name);
        this.nameToCode.set(c.name.toLowerCase(), c.id);
      }
    }
  }

  /**
   * Resolve a country value (could be code or name) into { countryCode, countryName }.
   */
  private resolveCountry(country?: string): { countryCode?: string; countryName?: string } {
    if (!country) { return {}; }

    // Try as code first (e.g. "US")
    const upper = country.toUpperCase();
    const nameByCode = this.codeToName.get(upper);
    if (nameByCode) {
      return { countryCode: upper, countryName: nameByCode };
    }

    // Try as name (e.g. "United States")
    const lower = country.toLowerCase();
    const codeByName = this.nameToCode.get(lower);
    if (codeByName) {
      return { countryCode: codeByName, countryName: country };
    }

    // No match — pass as-is in countryName
    return { countryName: country };
  }

  /**
   * Transform MCP Address to VirtoCommerce native Address format
   */
  toVirtoAddress(address: Address, addressType?: 'Billing' | 'Shipping'): VirtoAddress {
    const { countryCode, countryName } = this.resolveCountry(address.country);
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
      countryCode,
      countryName,
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

    // Prefer explicit firstName/lastName fields; fall back to splitting name
    const firstName = address.firstName || this.splitName(address.name).firstName;
    const lastName = address.lastName || this.splitName(address.name).lastName;

    return {
      address1: address.line1 ?? '',
      address2: address.line2 ?? '',
      city: address.city ?? '',
      country: address.countryName ?? address.countryCode ?? '',
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
