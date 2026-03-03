/**
 * VirtoCommerce Store model
 *
 * Based on VirtoCommerce.StoreModule.Core.Model.Store
 * Fetched via GET /api/stores/{storeId}
 */

export interface Store {
  id?: string;
  name?: string;
  description?: string;
  url?: string;
  storeState?: number;
  timeZone?: string;
  country?: string;
  region?: string;
  defaultLanguage?: string;
  defaultCurrency?: string;
  catalog?: string;
  languages?: string[];
  currencies?: string[];
  trustedGroups?: string[];
  outerId?: string;
}
