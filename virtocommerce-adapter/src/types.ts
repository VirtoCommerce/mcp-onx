/**
 * VirtoCommerce adapter types
 */

// Configuration options for the adapter
export interface AdapterOptions {
  apiUrl: string;
  apiKey: string;
  workspace?: string;
  catalogId?: string;
  timeout?: number;
  retryAttempts?: number;
  debugMode?: boolean;
}

// Standard API response wrapper used by ApiClient
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// Status mapping configuration
// Keys are the actual VirtoCommerce status strings (from ModuleConstants.CustomerOrderStatus)
export const STATUS_MAP: Record<string, string> = {
  // Standard VC order statuses
  New: 'pending',
  'Not payed': 'not_payed',
  Pending: 'pending_approval',
  Processing: 'processing',
  'Ready to send': 'ready_to_send',
  Cancelled: 'cancelled',
  'Partially sent': 'partially_shipped',
  Completed: 'completed',
  // Legacy/custom VC statuses kept for backwards compatibility
  Shipped: 'shipped',
  Delivered: 'delivered',
  OnHold: 'on_hold',
  Refunded: 'refunded',
  PartiallyShipped: 'partially_shipped',
  PartiallyDelivered: 'partially_delivered',
};

// Reverse mapping: normalized MCP status → actual VirtoCommerce status string
export const REVERSE_STATUS_MAP: Record<string, string> = {
  pending: 'New',
  not_payed: 'Not payed',
  pending_approval: 'Pending',
  processing: 'Processing',
  ready_to_send: 'Ready to send',
  cancelled: 'Cancelled',
  partially_shipped: 'Partially sent',
  completed: 'Completed',
  // Non-standard VC statuses (VC accepts any string for status)
  shipped: 'Shipped',
  delivered: 'Delivered',
  on_hold: 'OnHold',
  refunded: 'Refunded',
  partially_delivered: 'PartiallyDelivered',
};

// Error codes for consistent error handling
export enum ErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  INVALID_ORDER_STATE = 'INVALID_ORDER_STATE',
  RETURN_NOT_FOUND = 'RETURN_NOT_FOUND',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
