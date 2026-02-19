/**
 * VirtoCommerce Fulfillment Adapter Implementation
 *
 * Main adapter class that implements IFulfillmentAdapter interface.
 * Delegates to domain-specific services for actual operations.
 */

import type {
  IFulfillmentAdapter,
  AdapterConfig,
  AdapterCapabilities,
  HealthStatus,
  OrderResult,
  ReturnResult,
  FulfillmentToolResult,
  Order,
  Fulfillment,
  Return,
  InventoryItem,
  Product,
  ProductVariant,
  Customer,
  CreateSalesOrderInput,
  CreateReturnInput,
  CancelOrderInput,
  UpdateOrderInput,
  FulfillOrderInput,
  GetOrdersInput,
  GetInventoryInput,
  GetProductsInput,
  GetProductVariantsInput,
  GetCustomersInput,
  GetFulfillmentsInput,
  GetReturnsInput,
} from '@cof-org/mcp';
import { AdapterError } from '@cof-org/mcp';
import { ApiClient } from './utils/api-client.js';
import type { AdapterOptions } from './types.js';
import { ErrorCode } from './types.js';
import { getErrorMessage } from './utils/type-guards.js';
import {
  OrderService,
  CustomerService,
  FulfillmentService,
  ProductService,
  ReturnService,
} from './services/index.js';

export class VirtoCommerceFulfillmentAdapter implements IFulfillmentAdapter {
  private client: ApiClient;
  private connected = false;
  private options: AdapterOptions;

  // Domain services
  private orderService: OrderService;
  private customerService: CustomerService;
  private fulfillmentService: FulfillmentService;
  private productService: ProductService;
  private returnService: ReturnService;

  constructor(config: any = {}) {
    const options = config.options || config;

    this.options = {
      apiUrl: options.apiUrl || 'https://api.yourfulfillment.com',
      apiKey: options.apiKey || '',
      workspace: options.workspace,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      debugMode: options.debugMode || false,
    };

    this.client = new ApiClient({
      baseUrl: this.options.apiUrl,
      apiKey: this.options.apiKey,
      timeout: this.options.timeout,
      retryAttempts: this.options.retryAttempts,
      debugMode: this.options.debugMode,
    });

    const tenantId = this.getTenantId();

    // Initialize services
    this.orderService = new OrderService(this.client, tenantId, this.options.workspace);
    this.customerService = new CustomerService(this.client, tenantId);
    this.fulfillmentService = new FulfillmentService(this.client, tenantId);
    this.productService = new ProductService(this.client, tenantId);
    this.returnService = new ReturnService(this.client);
  }

  // Lifecycle methods

  async initialize?(config: AdapterConfig): Promise<void> {
    this.updateOptions(config.options ?? {});
  }

  async cleanup?(): Promise<void> {
    this.connected = false;
  }

  async connect(): Promise<void> {
    try {
      const response = await this.client.get('/health');

      if (!response.success) {
        throw new AdapterError(
          'Failed to connect to VirtoCommerce',
          ErrorCode.CONNECTION_FAILED,
          response
        );
      }

      this.connected = true;
      console.error('Successfully connected to VirtoCommerce');
    } catch (error: unknown) {
      this.connected = false;
      throw new AdapterError(
        `Connection failed: ${getErrorMessage(error)}`,
        ErrorCode.CONNECTION_FAILED,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.error('Disconnected from VirtoCommerce');
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await this.client.get('/health');

      return {
        status: response.success ? 'healthy' : 'unhealthy',
        timestamp: this.now(),
        checks: [
          {
            name: 'api_connection',
            status: response.success ? 'pass' : 'fail',
            message: response.success ? 'API is reachable' : 'API connection failed',
          },
          {
            name: 'authentication',
            status: this.connected ? 'pass' : 'fail',
            message: this.connected ? 'Authenticated' : 'Not authenticated',
          },
        ],
        version: '1.0.0',
      };
    } catch (error: unknown) {
      return {
        status: 'unhealthy',
        timestamp: this.now(),
        checks: [
          {
            name: 'api_connection',
            status: 'fail',
            message: `Health check failed: ${getErrorMessage(error)}`,
          },
        ],
      };
    }
  }

  async checkHealth?(): Promise<HealthStatus> {
    return this.healthCheck();
  }

  async getCapabilities?(): Promise<AdapterCapabilities> {
    return {
      supportsOrderCapture: true,
      supportsShipping: true,
      supportsCustomFields: true,
      maxBatchSize: 50,
    };
  }

  async updateConfig?(config: AdapterConfig): Promise<void> {
    this.updateOptions(config.options ?? {});
  }

  // Order operations (delegated to OrderService)

  async createSalesOrder(input: CreateSalesOrderInput): Promise<OrderResult> {
    return this.orderService.createSalesOrder(input);
  }

  async cancelOrder(input: CancelOrderInput): Promise<OrderResult> {
    return this.orderService.cancelOrder(input);
  }

  async updateOrder(input: UpdateOrderInput): Promise<OrderResult> {
    return this.orderService.updateOrder(input);
  }

  async getOrders(input: GetOrdersInput): Promise<FulfillmentToolResult<{ orders: Order[] }>> {
    return this.orderService.getOrders(input);
  }

  // Fulfillment operations (delegated to FulfillmentService)

  async fulfillOrder(input: FulfillOrderInput): Promise<FulfillmentToolResult<{ fulfillment: Fulfillment }>> {
    return this.fulfillmentService.fulfillOrder(input);
  }

  async getFulfillments(
    input: GetFulfillmentsInput
  ): Promise<FulfillmentToolResult<{ fulfillments: Fulfillment[] }>> {
    return this.fulfillmentService.getFulfillments(input);
  }

  // Customer operations (delegated to CustomerService)

  async getCustomers(input: GetCustomersInput): Promise<FulfillmentToolResult<{ customers: Customer[] }>> {
    return this.customerService.getCustomers(input);
  }

  // Product operations (delegated to ProductService)

  async getProducts(input: GetProductsInput): Promise<FulfillmentToolResult<{ products: Product[] }>> {
    return this.productService.getProducts(input);
  }

  async getProductVariants(
    input: GetProductVariantsInput
  ): Promise<FulfillmentToolResult<{ productVariants: ProductVariant[] }>> {
    return this.productService.getProductVariants(input);
  }

  async getInventory(input: GetInventoryInput): Promise<FulfillmentToolResult<{ inventory: InventoryItem[] }>> {
    return this.productService.getInventory(input);
  }

  // Return operations (delegated to ReturnService)

  async createReturn(input: CreateReturnInput): Promise<ReturnResult> {
    return this.returnService.createReturn(input);
  }

  async getReturns(input: GetReturnsInput): Promise<FulfillmentToolResult<{ returns: Return[] }>> {
    return this.returnService.getReturns(input);
  }

  // Private helper methods

  private updateOptions(options: Partial<AdapterOptions>): void {
    if (!options) {
      return;
    }

    this.options = {
      ...this.options,
      ...options,
    };

    if (options.apiKey) {
      this.client.updateApiKey(options.apiKey);
    }

    if (typeof options.debugMode === 'boolean') {
      this.client.setDebugMode(options.debugMode);
    }

    // Update tenant ID in all services
    const tenantId = this.getTenantId();
    this.orderService.setTenantId(tenantId);
    this.customerService.setTenantId(tenantId);
    this.fulfillmentService.setTenantId(tenantId);
    this.productService.setTenantId(tenantId);

    if (options.workspace) {
      this.orderService.setWorkspace(options.workspace);
    }

    if (options.catalogId) {
      this.orderService.setCatalogId(options.catalogId);
    }
  }

  private getTenantId(): string {
    return this.options.workspace ?? 'default-workspace';
  }

  private now(): string {
    return new Date().toISOString();
  }
}
