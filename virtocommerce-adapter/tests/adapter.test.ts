/**
 * Unit tests for YourFulfillment Adapter
 *
 * These tests demonstrate how to test your adapter implementation.
 * Replace with actual tests for your Fulfillment integration.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { readFileSync } from 'fs';
import { VirtoCommerceFulfillmentAdapter } from '../src/adapter.js';
import { ApiClient } from '../src/utils/api-client.js';
import type {
  CreateSalesOrderInput,
  CancelOrderInput,
  UpdateOrderInput,
  GetOrdersInput,
  GetInventoryInput,
  GetCustomersInput,
  GetProductsInput,
  GetProductVariantsInput,
} from '@cof-org/mcp';

function readResponse(path: string) {
  return readFileSync(new URL(`./fixtures/${path}.json`, import.meta.url), 'utf-8');
}

describe('VirtoCommerceFulfillmentAdapter', () => {
  let adapter: VirtoCommerceFulfillmentAdapter;
  let mockApiClient: ApiClient;
  let getSpy: jest.MockedFunction<any>;
  let postSpy: jest.MockedFunction<any>;
  let putSpy: jest.MockedFunction<any>;
  let patchSpy: jest.MockedFunction<any>;

  beforeEach(() => {
    // Create adapter instance
    adapter = new VirtoCommerceFulfillmentAdapter({
      apiUrl: 'https://localhost:5001',
      apiKey: '76bf85d9-196e-4d4a-a6d7-6765102361c9',
      workspace: 'test-workspace',
      timeout: 5000,
      debugMode: false,
    });

    // Get mocked API client
    mockApiClient = (adapter as any).client;
    getSpy = jest.spyOn(mockApiClient, 'get') as unknown as jest.MockedFunction<any>;
    postSpy = jest.spyOn(mockApiClient, 'post') as unknown as jest.MockedFunction<any>;
    putSpy = jest.spyOn(mockApiClient, 'put') as unknown as jest.MockedFunction<any>;
    patchSpy = jest.spyOn(mockApiClient, 'patch') as unknown as jest.MockedFunction<any>;
  });

  describe('Lifecycle Methods', () => {
    describe('connect', () => {
      it('should connect successfully when API is healthy', async () => {
        getSpy.mockResolvedValue({
          success: true,
          data: { status: 'healthy' },
        });

        await expect(adapter.connect()).resolves.not.toThrow();
        expect(getSpy).toHaveBeenCalledWith('/health');
      });

      it('should throw error when API is unreachable', async () => {
        getSpy.mockResolvedValue({
          success: false,
          error: { code: 'CONNECTION_FAILED', message: 'Connection failed' },
        });

        await expect(adapter.connect()).rejects.toThrow('Connection failed');
      });
    });

    describe('disconnect', () => {
      it('should disconnect successfully', async () => {
        await expect(adapter.disconnect()).resolves.not.toThrow();
      });
    });

    describe('healthCheck', () => {
      it('should return healthy status when API is working', async () => {
        getSpy.mockResolvedValue({
          success: true,
          data: { status: 'operational' },
        });

        const result = await adapter.healthCheck();

        expect(result.status).toBe('healthy');
        expect(result.checks).toHaveLength(2);
        expect(result.checks?.[0]?.status).toBe('pass');
      });

      it('should return unhealthy status when API fails', async () => {
        getSpy.mockRejectedValue(new Error('Network error'));

        const result = await adapter.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.checks?.[0]?.status).toBe('fail');
      });
    });
  });

  describe('Order Actions', () => {
    describe('createSalesOrder', () => {
      const validOrderInput: CreateSalesOrderInput = {
        order: {
          lineItems: [
            {
              sku: 'PROD-001',
              quantity: 2,
              unitPrice: 29.99,
              name: 'Test Product',
            },
          ],
          customer: {
            id: 'CUST-001',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            tenantId: 'test-tenant',
          },
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            address2: 'Apt 4',
            city: 'New York',
            stateOrProvince: 'NY',
            zipCodeOrPostalCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
          billingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            address2: 'Apt 4',
            city: 'New York',
            stateOrProvince: 'NY',
            zipCodeOrPostalCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
          totalPrice: 57.48,
          currency: 'USD',
          orderNote: 'Please handle with care',
          orderSource: 'website',
          name: 'ORD-2024-001',
          status: 'pending',
        },
      };

      it('should create sales order successfully', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            external_id: 'EXT-001',
            status: 'new',
            customer: {
              id: 'CUST-001',
              email: 'test@example.com',
              first_name: 'John',
              last_name: 'Doe',
            },
            items: [
              {
                sku: 'PROD-001',
                name: 'Test Product',
                quantity: 2,
                price: 29.99,
                subtotal: 59.98,
              },
            ],
            total: 57.48,
            currency: 'USD',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            shipping_address: {},
            billing_address: {},
          },
        });

        const result = await adapter.createSalesOrder(validOrderInput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.order.id).toBe('ORDER-001');
          expect(result.order.name).toBe('ORD-2024-001');
          expect(result.order.status).toBeDefined();
        }
        expect(postSpy).toHaveBeenCalledWith('/orders', expect.any(Object));
      });

      it('should handle order creation failure', async () => {
        postSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order data',
          },
        });

        const result = await adapter.createSalesOrder(validOrderInput);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });

    describe('cancelOrder', () => {
      it('should cancel order successfully', async () => {
        // Mock GET to fetch the existing order
        getSpy.mockResolvedValue({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            outerId: 'EXT-001',
            status: 'New',
            isCancelled: false,
            customerId: 'CUST-001',
            customerName: 'John Doe',
            items: [],
            total: 100.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        // Mock PUT to save the cancelled order
        putSpy.mockResolvedValue({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            outerId: 'EXT-001',
            status: 'Cancelled',
            isCancelled: true,
            cancelledState: 'Completed',
            cancelReason: 'Customer request',
            cancelledDate: '2024-01-01T12:00:00Z',
            customerId: 'CUST-001',
            customerName: 'John Doe',
            items: [],
            total: 100.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T12:00:00Z',
          },
        });

        const input: CancelOrderInput = {
          orderId: 'ORDER-001',
          reason: 'Customer request',
          notifyCustomer: true,
        };

        const result = await adapter.cancelOrder(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.order.id).toBe('ORDER-001');
          expect(result.order.status).toBe('cancelled');
        }
        expect(getSpy).toHaveBeenCalledWith('/api/order/customerOrders/ORDER-001');
        expect(putSpy).toHaveBeenCalledWith(
          '/api/order/customerOrders',
          expect.objectContaining({
            isCancelled: true,
            cancelReason: 'Customer request',
            cancelledState: 'Completed',
            status: 'Cancelled',
          })
        );
      });

      it('should handle cancellation failure when order not found', async () => {
        getSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
          },
        });

        const input: CancelOrderInput = {
          orderId: 'INVALID-ID',
        };

        const result = await adapter.cancelOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      it('should fail when order is already cancelled', async () => {
        getSpy.mockResolvedValue({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            status: 'Cancelled',
            isCancelled: true,
            cancelledDate: '2024-01-01T00:00:00Z',
          },
        });

        const input: CancelOrderInput = {
          orderId: 'ORDER-001',
          reason: 'Customer request',
        };

        const result = await adapter.cancelOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('already cancelled');
        }
      });
    });

    describe('updateOrder', () => {
      it('should update order successfully', async () => {
        patchSpy.mockResolvedValue({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            external_id: 'EXT-001',
            status: 'processing',
            customer: {
              id: 'CUST-001',
              email: 'test@example.com',
              first_name: 'Jane',
              last_name: 'Smith',
            },
            items: [],
            total: 100.0,
            currency: 'USD',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            shipping_address: {
              street1: '456 Oak Ave',
              city: 'Los Angeles',
              state: 'CA',
              postal_code: '90001',
              country: 'US',
            },
            billing_address: {},
          },
        });

        const input: UpdateOrderInput = {
          id: 'ORDER-001',
          updates: {
            status: 'processing',
            shippingAddress: {
              firstName: 'Jane',
              lastName: 'Smith',
              address1: '456 Oak Ave',
              city: 'Los Angeles',
              stateOrProvince: 'CA',
              zipCodeOrPostalCode: '90001',
              country: 'US',
            },
          },
        };

        const result = await adapter.updateOrder(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.order.id).toBe('ORDER-001');
          expect(result.order.status).toBe('processing');
        }
      });
    });
  });

  describe('Query Operations', () => {
    describe('getOrders', () => {
      it('should get orders by IDs', async () => {
        const response = readResponse('getOrders/getOrdersByIdResponse');
        postSpy.mockResolvedValue({
          success: true,
          data: JSON.parse(response),
        });

        const input: GetOrdersInput = {
          ids: ['ORDER-001'],
        };

        const result = await adapter.getOrders(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.orders).toHaveLength(1);
          expect(result.orders[0]?.id).toBe('ORDER-001');
          expect(result.orders[0]?.status).toBe('pending');
        }
        expect(postSpy).toHaveBeenCalledWith('/api/order/customerOrders/search', expect.any(Object));
      });

      it('should get orders by external IDs', async () => {
        const response = readResponse('getOrders/getOrdersByIdResponse');
        postSpy.mockResolvedValue({
          success: true,
          data: JSON.parse(response),
        });

        const input: GetOrdersInput = {
          externalIds: ['EXT-001'],
        };

        const result = await adapter.getOrders(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.orders).toHaveLength(1);
          expect(result.orders[0]?.externalId).toBe('EXT-001');
        }
      });

      it('should handle empty results', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: [],
        });

        const input: GetOrdersInput = {
          ids: ['NON-EXISTENT'],
        };

        const result = await adapter.getOrders(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.orders).toHaveLength(0);
        }
      });
    });

    describe('getCustomers', () => {
      it('should get customers by IDs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'CUST-001',
                memberType: 'Contact',
                firstName: 'John',
                lastName: 'Doe',
                emails: ['john@example.com'],
                phones: ['+1234567890'],
                addresses: [],
                groups: ['VIP'],
                status: 'active',
                outerId: 'EXT-CUST-001',
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-15T00:00:00Z',
                dynamicProperties: [],
              },
            ],
          },
        });

        const input: GetCustomersInput = {
          ids: ['CUST-001'],
        };

        const result = await adapter.getCustomers(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.customers).toHaveLength(1);
          expect(result.customers[0]?.id).toBe('CUST-001');
          expect(result.customers[0]?.firstName).toBe('John');
          expect(result.customers[0]?.lastName).toBe('Doe');
          expect(result.customers[0]?.email).toBe('john@example.com');
          expect(result.customers[0]?.phone).toBe('+1234567890');
          expect(result.customers[0]?.externalId).toBe('EXT-CUST-001');
          expect(result.customers[0]?.tags).toEqual(['VIP']);
        }
        expect(postSpy).toHaveBeenCalledWith(
          '/api/members/search',
          expect.objectContaining({
            objectIds: ['CUST-001'],
            memberTypes: ['Contact'],
            responseGroup: 'Full',
          })
        );
      });

      it('should get customers by email', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'CUST-002',
                memberType: 'Contact',
                firstName: 'Jane',
                lastName: 'Smith',
                emails: ['jane@example.com'],
                phones: [],
                addresses: [],
                groups: [],
                status: 'active',
                createdDate: '2024-02-01T00:00:00Z',
                modifiedDate: '2024-02-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetCustomersInput = {
          emails: ['jane@example.com'],
        };

        const result = await adapter.getCustomers(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.customers).toHaveLength(1);
          expect(result.customers[0]?.firstName).toBe('Jane');
          expect(result.customers[0]?.email).toBe('jane@example.com');
        }
      });

      it('should handle empty customer results', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 0,
            results: [],
          },
        });

        const input: GetCustomersInput = {
          ids: ['NON-EXISTENT'],
        };

        const result = await adapter.getCustomers(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.customers).toHaveLength(0);
        }
      });

      it('should handle customer search failure', async () => {
        postSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Internal server error',
          },
        });

        const input: GetCustomersInput = {
          ids: ['CUST-001'],
        };

        const result = await adapter.getCustomers(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });

    describe('getProducts', () => {
      it('should get products by IDs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'PROD-001',
                code: 'SKU-001',
                name: 'Stainless Steel Bolt',
                isActive: true,
                isBuyable: true,
                vendor: 'BoltCo',
                catalogId: 'CAT-001',
                categoryId: 'CATEG-001',
                outerId: 'EXT-PROD-001',
                imgSrc: 'https://example.com/bolt.jpg',
                images: [
                  { url: 'https://example.com/bolt.jpg', name: 'Main' },
                  { url: 'https://example.com/bolt-2.jpg', name: 'Side' },
                ],
                reviews: [
                  { reviewType: 'FullReview', content: 'High-quality stainless steel bolt' },
                ],
                categories: [
                  { id: 'CATEG-001', name: 'Fasteners' },
                ],
                properties: [
                  {
                    name: 'Material',
                    type: 'Product',
                    values: [{ value: 'Stainless Steel' }],
                  },
                ],
                variations: [
                  {
                    id: 'VAR-001',
                    code: 'SKU-001-SM',
                    name: 'Stainless Steel Bolt - Small',
                    mainProductId: 'PROD-001',
                    properties: [
                      { name: 'Size', type: 'Variation', values: [{ value: 'Small' }] },
                    ],
                    createdDate: '2024-01-01T00:00:00Z',
                    modifiedDate: '2024-01-01T00:00:00Z',
                  },
                  {
                    id: 'VAR-002',
                    code: 'SKU-001-LG',
                    name: 'Stainless Steel Bolt - Large',
                    mainProductId: 'PROD-001',
                    properties: [
                      { name: 'Size', type: 'Variation', values: [{ value: 'Large' }] },
                    ],
                    createdDate: '2024-01-01T00:00:00Z',
                    modifiedDate: '2024-01-01T00:00:00Z',
                  },
                ],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-06-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetProductsInput = {
          ids: ['PROD-001'],
        };

        const result = await adapter.getProducts(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.products).toHaveLength(1);
          const product = result.products[0]!;
          expect(product.id).toBe('PROD-001');
          expect(product.name).toBe('Stainless Steel Bolt');
          expect(product.externalProductId).toBe('SKU-001');
          expect(product.description).toBe('High-quality stainless steel bolt');
          expect(product.status).toBe('active');
          expect(product.vendor).toBe('BoltCo');
          expect(product.categories).toEqual(['Fasteners']);
          expect(product.imageURLs).toEqual([
            'https://example.com/bolt.jpg',
            'https://example.com/bolt-2.jpg',
          ]);
          expect(product.options).toEqual([
            { name: 'Size', values: ['Small', 'Large'] },
          ]);
          expect(product.customFields).toEqual([
            { name: 'Material', value: 'Stainless Steel' },
          ]);
        }
        expect(postSpy).toHaveBeenCalledWith(
          '/api/catalog/search/products',
          expect.objectContaining({
            objectIds: ['PROD-001'],
          })
        );
      });

      it('should get products by SKUs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'PROD-002',
                code: 'BOLT-42',
                name: 'Hex Bolt',
                isActive: true,
                isBuyable: true,
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetProductsInput = {
          skus: ['BOLT-42'],
        };

        const result = await adapter.getProducts(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.products).toHaveLength(1);
          expect(result.products[0]?.externalProductId).toBe('BOLT-42');
        }
        expect(postSpy).toHaveBeenCalledWith(
          '/api/catalog/search/products',
          expect.objectContaining({
            codes: ['BOLT-42'],
          })
        );
      });

      it('should handle empty product results', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 0,
            results: [],
          },
        });

        const input: GetProductsInput = {
          ids: ['NON-EXISTENT'],
        };

        const result = await adapter.getProducts(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.products).toHaveLength(0);
        }
      });

      it('should handle product search failure', async () => {
        postSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Search service unavailable',
          },
        });

        const input: GetProductsInput = {
          ids: ['PROD-001'],
        };

        const result = await adapter.getProducts(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      it('should map inactive products correctly', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'PROD-003',
                code: 'INACTIVE-001',
                name: 'Discontinued Bolt',
                isActive: false,
                isBuyable: false,
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetProductsInput = {
          ids: ['PROD-003'],
        };

        const result = await adapter.getProducts(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.products[0]?.status).toBe('inactive');
        }
      });
    });

    describe('getProductVariants', () => {
      it('should get variants by parent product IDs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'PROD-001',
                code: 'BOLT-BASE',
                name: 'Stainless Steel Bolt',
                isActive: true,
                isBuyable: true,
                variations: [
                  {
                    id: 'VAR-001',
                    code: 'BOLT-SM',
                    name: 'Stainless Steel Bolt - Small',
                    mainProductId: 'PROD-001',
                    outerId: 'EXT-VAR-001',
                    gtin: '0012345678901',
                    trackInventory: true,
                    weight: 0.5,
                    weightUnit: 'kg',
                    length: 5,
                    width: 1,
                    height: 1,
                    measureUnit: 'cm',
                    images: [
                      { url: 'https://example.com/bolt-sm.jpg' },
                    ],
                    properties: [
                      {
                        name: 'Size',
                        type: 'Variation',
                        values: [{ value: 'Small' }],
                      },
                      {
                        name: 'Color',
                        type: 'Variation',
                        values: [{ value: 'Silver' }],
                      },
                      {
                        name: 'Finish',
                        type: 'Product',
                        values: [{ value: 'Polished' }],
                      },
                    ],
                    createdDate: '2024-01-01T00:00:00Z',
                    modifiedDate: '2024-03-01T00:00:00Z',
                  },
                  {
                    id: 'VAR-002',
                    code: 'BOLT-LG',
                    name: 'Stainless Steel Bolt - Large',
                    mainProductId: 'PROD-001',
                    weight: 1.2,
                    weightUnit: 'kg',
                    properties: [
                      {
                        name: 'Size',
                        type: 'Variation',
                        values: [{ value: 'Large' }],
                      },
                      {
                        name: 'Color',
                        type: 'Variation',
                        values: [{ value: 'Silver' }],
                      },
                    ],
                    createdDate: '2024-01-01T00:00:00Z',
                    modifiedDate: '2024-03-01T00:00:00Z',
                  },
                ],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-06-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetProductVariantsInput = {
          productIds: ['PROD-001'],
        };

        const result = await adapter.getProductVariants(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.productVariants).toHaveLength(2);

          const variant1 = result.productVariants[0]!;
          expect(variant1.id).toBe('VAR-001');
          expect(variant1.productId).toBe('PROD-001');
          expect(variant1.sku).toBe('BOLT-SM');
          expect(variant1.title).toBe('Stainless Steel Bolt - Small');
          expect(variant1.externalId).toBe('EXT-VAR-001');
          expect(variant1.externalProductId).toBe('BOLT-BASE');
          expect(variant1.barcode).toBe('0012345678901');
          expect(variant1.selectedOptions).toEqual([
            { name: 'Size', value: 'Small' },
            { name: 'Color', value: 'Silver' },
          ]);
          expect(variant1.weight).toEqual({ value: 0.5, unit: 'kg' });
          expect(variant1.dimensions).toEqual({ length: 5, width: 1, height: 1, unit: 'cm' });
          expect(variant1.imageURLs).toEqual(['https://example.com/bolt-sm.jpg']);
          expect(variant1.customFields).toEqual([{ name: 'Finish', value: 'Polished' }]);

          const variant2 = result.productVariants[1]!;
          expect(variant2.id).toBe('VAR-002');
          expect(variant2.sku).toBe('BOLT-LG');
          expect(variant2.weight).toEqual({ value: 1.2, unit: 'kg' });
        }

        expect(postSpy).toHaveBeenCalledWith(
          '/api/catalog/search/products',
          expect.objectContaining({
            objectIds: ['PROD-001'],
            searchInVariations: false,
          })
        );
      });

      it('should get variants by SKUs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'VAR-001',
                code: 'BOLT-SM',
                name: 'Stainless Steel Bolt - Small',
                mainProductId: 'PROD-001',
                isActive: true,
                isBuyable: true,
                properties: [
                  {
                    name: 'Size',
                    type: 'Variation',
                    values: [{ value: 'Small' }],
                  },
                ],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetProductVariantsInput = {
          skus: ['BOLT-SM'],
        };

        const result = await adapter.getProductVariants(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.productVariants).toHaveLength(1);
          expect(result.productVariants[0]?.sku).toBe('BOLT-SM');
          expect(result.productVariants[0]?.productId).toBe('PROD-001');
        }

        expect(postSpy).toHaveBeenCalledWith(
          '/api/catalog/search/products',
          expect.objectContaining({
            codes: ['BOLT-SM'],
            searchInVariations: true,
          })
        );
      });

      it('should handle product without variations as single variant', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'PROD-SIMPLE',
                code: 'SIMPLE-001',
                name: 'Simple Product',
                isActive: true,
                isBuyable: true,
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetProductVariantsInput = {
          productIds: ['PROD-SIMPLE'],
        };

        const result = await adapter.getProductVariants(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.productVariants).toHaveLength(1);
          expect(result.productVariants[0]?.id).toBe('PROD-SIMPLE');
          expect(result.productVariants[0]?.sku).toBe('SIMPLE-001');
        }
      });

      it('should handle empty variant results', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 0,
            results: [],
          },
        });

        const input: GetProductVariantsInput = {
          productIds: ['NON-EXISTENT'],
        };

        const result = await adapter.getProductVariants(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.productVariants).toHaveLength(0);
        }
      });

      it('should handle variant search failure', async () => {
        postSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Catalog service unavailable',
          },
        });

        const input: GetProductVariantsInput = {
          skus: ['BOLT-SM'],
        };

        const result = await adapter.getProductVariants(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });

    describe('getInventory', () => {
      it('should get inventory for SKUs', async () => {
        getSpy.mockResolvedValue({
          success: true,
          data: [
            {
              sku: 'PROD-001',
              available: 100,
              reserved: 10,
              total: 110,
              warehouse_locations: [
                { location_id: 'LOC-001', available: 60, reserved: 5 },
                { location_id: 'LOC-002', available: 40, reserved: 5 },
              ],
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        });

        const input: GetInventoryInput = {
          skus: ['PROD-001'],
        };

        const result = await adapter.getInventory(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.inventory.length).toBeGreaterThan(0);
          expect(result.inventory[0]?.sku).toBe('PROD-001');
          expect(result.inventory[0]?.available).toBe(60);
          expect(result.inventory[0]?.locationId).toBe('LOC-001');
        }
      });

      it('should handle inventory lookup failure', async () => {
        getSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'SKU not found',
          },
        });

        const input: GetInventoryInput = {
          skus: ['INVALID-SKU'],
        };

        const result = await adapter.getInventory(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      getSpy.mockRejectedValue(new Error('Network timeout'));

      const input: GetOrdersInput = { ids: ['ORDER-001'] };
      const result = await adapter.getOrders(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle API errors with proper error codes', async () => {
      postSpy.mockResolvedValue({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
      });

      const input: CreateSalesOrderInput = {
        order: {
          lineItems: [{ sku: 'PROD-001', quantity: 1 }],
        },
      };

      const result = await adapter.createSalesOrder(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
