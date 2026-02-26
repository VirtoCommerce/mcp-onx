/**
 * Base service with shared utilities for all domain services
 */

import type { FulfillmentToolResult } from '@virtocommerce/cof-mcp';
import { AdapterError } from '@virtocommerce/cof-mcp';
import { ErrorCode } from '../types.js';
import { ApiClient } from '../utils/api-client.js';

export abstract class BaseService {
  protected client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  protected success<T>(payload: T): FulfillmentToolResult<T> {
    return { success: true, ...payload } as FulfillmentToolResult<T>;
  }

  protected failure<T>(message: string, error?: unknown): FulfillmentToolResult<T> {
    return {
      success: false,
      error: error ?? new AdapterError(message, ErrorCode.API_ERROR, { message }),
      message,
    } as FulfillmentToolResult<T>;
  }

  protected ensureArray<T>(data: T | T[] | undefined | null): T[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : [data];
  }
}
