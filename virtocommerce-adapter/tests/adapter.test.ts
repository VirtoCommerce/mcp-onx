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
  FulfillOrderInput,
  CreateReturnInput,
  GetOrdersInput,
  GetInventoryInput,
  GetCustomersInput,
  GetProductsInput,
  GetProductVariantsInput,
  GetFulfillmentsInput,
  GetReturnsInput,
} from '@virtocommerce/cof-mcp';

function readResponse(path: string) {
  return readFileSync(new URL(`./fixtures/${path}.json`, import.meta.url), 'utf-8');
}

describe('VirtoCommerceFulfillmentAdapter', () => {
  let adapter: VirtoCommerceFulfillmentAdapter;
  let mockApiClient: ApiClient;
  let getSpy: jest.MockedFunction<any>;
  let postSpy: jest.MockedFunction<any>;
  let putSpy: jest.MockedFunction<any>;

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
  });

  describe('Constructor Validation', () => {
    it('should throw when apiUrl is missing', () => {
      expect(() => new VirtoCommerceFulfillmentAdapter({ apiKey: 'key' })).toThrow('apiUrl is required');
    });

    it('should throw when apiKey is missing', () => {
      expect(() => new VirtoCommerceFulfillmentAdapter({ apiUrl: 'https://example.com' })).toThrow(
        'apiKey is required'
      );
    });
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

      it('should share CustomerService between adapter and OrderService so countries propagate', async () => {
        // Simulate connect: health → store → countries
        getSpy.mockImplementation(async (path: string) => {
          if (path === '/health') {
            return { success: true, data: { status: 'healthy' } };
          }
          if (path.startsWith('/api/stores/')) {
            return { success: true, data: { id: 'test-workspace', name: 'Test', catalog: 'cat1' } };
          }
          if (path === '/api/platform/common/countries') {
            return { success: true, data: [{ id: 'US', name: 'United States' }] };
          }
          return { success: true, data: {} };
        });

        await adapter.connect();

        // The OrderService's internal customerService should be the same instance as the adapter's
        const adapterCustomerService = (adapter as any).customerService;
        const orderServiceCustomerService = (adapter as any).orderService.customerService;
        expect(orderServiceCustomerService).toBe(adapterCustomerService);
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
        // Mock customer lookup
        getSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'CUST-001', firstName: 'John', lastName: 'Doe', emails: ['test@example.com'] },
        });

        // Mock step 1: SKU resolution via catalog search
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 0,
            items: [],
          },
        });

        // Mock step 2: order creation
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            outerId: 'EXT-001',
            status: 'New',
            customerId: 'CUST-001',
            customerName: 'John Doe',
            items: [
              {
                id: 'LI-001',
                sku: 'PROD-001',
                name: 'Test Product',
                quantity: 2,
                price: 29.99,
              },
            ],
            total: 57.48,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        const result = await adapter.createSalesOrder(validOrderInput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.order.id).toBe('ORDER-001');
          expect(result.order.name).toBe('ORD-2024-001');
          expect(result.order.status).toBeDefined();
        }
        expect(postSpy).toHaveBeenCalledWith('/api/order/customerOrders', expect.any(Object));

        // Verify payment document is included
        const createCall = postSpy.mock.calls.find(
          ([url]) => url === '/api/order/customerOrders'
        );
        const payload = createCall![1];
        expect(payload.inPayments).toHaveLength(1);
        expect(payload.inPayments[0]).toMatchObject({
          currency: 'USD',
          paymentStatus: 'New',
          gatewayCode: 'DefaultManualPaymentMethod',
          objectType: 'PaymentIn',
          customerId: 'CUST-001',
        });
      });

      it('should include shipment items matching order line items', async () => {
        // Mock customer lookup
        getSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'CUST-001', firstName: 'John', lastName: 'Doe' },
        });

        // Mock step 1: SKU resolution via catalog search
        postSpy.mockResolvedValueOnce({
          success: true,
          data: { totalCount: 0, items: [] },
        });

        // Mock step 2: order creation
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-002',
            number: 'ORD-2024-002',
            status: 'New',
            customerId: 'CUST-001',
            items: [
              { id: 'LI-001', sku: 'PROD-001', name: 'Test Product', quantity: 2, price: 29.99 },
            ],
            shipments: [
              {
                id: 'SHIP-001',
                shipmentMethodCode: 'UPS',
                items: [{ lineItemId: 'LI-001', quantity: 2 }],
              },
            ],
            total: 57.48,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        const result = await adapter.createSalesOrder(validOrderInput);
        expect(result.success).toBe(true);

        // Verify the payload sent to VirtoCommerce API includes shipment items
        const createCall = postSpy.mock.calls.find(
          ([url]) => url === '/api/order/customerOrders'
        );
        expect(createCall).toBeDefined();

        const payload = createCall![1];
        expect(payload.shipments).toHaveLength(1);
        expect(payload.shipments[0].items).toHaveLength(1);
        expect(payload.shipments[0].items[0]).toMatchObject({
          lineItem: expect.objectContaining({
            sku: 'PROD-001',
            name: 'Test Product',
            quantity: 2,
            price: 29.99,
          }),
          quantity: 2,
        });
      });

      it('should handle order creation failure', async () => {
        // Mock customer lookup (returns null/failure)
        getSpy.mockResolvedValueOnce({ success: false });

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

      it('should use customer default address when not provided in input', async () => {
        const inputWithoutAddress: CreateSalesOrderInput = {
          order: {
            lineItems: [{ sku: 'PROD-001', quantity: 1, unitPrice: 10.0, name: 'Widget' }],
            customer: { id: 'CUST-002' },
            currency: 'USD',
          },
        };

        // Mock customer lookup with addresses
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'CUST-002',
            firstName: 'Jane',
            lastName: 'Smith',
            emails: ['jane@example.com'],
            phones: ['+9876543210'],
            defaultShippingAddressId: 'addr-ship-1',
            defaultBillingAddressId: 'addr-bill-1',
            addresses: [
              {
                key: 'addr-ship-1',
                addressType: 'Shipping',
                firstName: 'Jane',
                lastName: 'Smith',
                line1: '456 Oak Ave',
                city: 'Chicago',
                regionName: 'IL',
                postalCode: '60601',
                countryName: 'US',
                phone: '+9876543210',
              },
              {
                key: 'addr-bill-1',
                addressType: 'Billing',
                firstName: 'Jane',
                lastName: 'Smith',
                line1: '789 Elm St',
                city: 'Chicago',
                regionName: 'IL',
                postalCode: '60602',
                countryName: 'US',
              },
            ],
          },
        });

        // Mock catalog search (returns product)
        postSpy.mockResolvedValueOnce({
          success: true,
          data: { totalCount: 0, items: [] },
        });

        // Mock order creation
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-ADDR',
            number: 'ORD-ADDR-001',
            status: 'New',
            customerId: 'CUST-002',
            items: [{ id: 'LI-001', sku: 'PROD-001', name: 'Widget', quantity: 1, price: 10.0 }],
            total: 10.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        const result = await adapter.createSalesOrder(inputWithoutAddress);
        expect(result.success).toBe(true);

        // Verify the payload includes the customer's default addresses
        const createCall = postSpy.mock.calls.find(
          ([url]) => url === '/api/order/customerOrders'
        );
        const payload = createCall![1];

        expect(payload.addresses).toHaveLength(2);
        expect(payload.addresses).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ addressType: 'Shipping', line1: '456 Oak Ave', city: 'Chicago' }),
            expect.objectContaining({ addressType: 'Billing', line1: '789 Elm St', city: 'Chicago' }),
          ])
        );

        // Verify shipment uses the default shipping address
        expect(payload.shipments).toHaveLength(1);
        expect(payload.shipments[0].deliveryAddress).toMatchObject({
          addressType: 'Shipping',
          line1: '456 Oak Ave',
        });
      });

      it('should use resolved prices when unitPrice not provided', async () => {
        const inputWithoutPrice: CreateSalesOrderInput = {
          order: {
            lineItems: [
              { sku: 'SKU-A', quantity: 3, name: 'Product A' },
              { sku: 'SKU-B', quantity: 1, name: 'Product B', unitPrice: 50.0 },
            ],
            customer: { id: 'CUST-003' },
            currency: 'USD',
          },
        };

        // Mock customer lookup
        getSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'CUST-003', firstName: 'Bob', lastName: 'Jones' },
        });

        // Mock catalog search — returns both products
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 2,
            items: [
              { id: 'pid-a', code: 'SKU-A', name: 'Product A' },
              { id: 'pid-b', code: 'SKU-B', name: 'Product B' },
            ],
          },
        });

        // Mock pricing evaluate
        postSpy.mockResolvedValueOnce({
          success: true,
          data: [
            { productId: 'pid-a', list: 25.0, sale: 20.0, currency: 'USD' },
            { productId: 'pid-b', list: 55.0, sale: null, currency: 'USD' },
          ],
        });

        // Mock order creation
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-PRICE',
            number: 'ORD-PRICE-001',
            status: 'New',
            customerId: 'CUST-003',
            items: [
              { id: 'LI-A', sku: 'SKU-A', name: 'Product A', quantity: 3, price: 20.0 },
              { id: 'LI-B', sku: 'SKU-B', name: 'Product B', quantity: 1, price: 50.0 },
            ],
            total: 110.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        const result = await adapter.createSalesOrder(inputWithoutPrice);
        expect(result.success).toBe(true);

        // Verify pricing API was called
        const pricingCall = postSpy.mock.calls.find(
          ([url]) => url === '/api/pricing/evaluate'
        );
        expect(pricingCall).toBeDefined();
        expect(pricingCall![1].productIds).toEqual(['pid-a', 'pid-b']);

        // Verify the payload uses resolved price for SKU-A and input price for SKU-B
        const createCall = postSpy.mock.calls.find(
          ([url]) => url === '/api/order/customerOrders'
        );
        const payload = createCall![1];

        const itemA = payload.items.find((i: any) => i.sku === 'SKU-A');
        expect(itemA.price).toBe(20.0); // sale price from pricing API
        expect(itemA.placedPrice).toBe(20.0);

        const itemB = payload.items.find((i: any) => i.sku === 'SKU-B');
        expect(itemB.price).toBe(50.0); // input unitPrice takes precedence
        expect(itemB.placedPrice).toBe(50.0);
      });

      it('should include payment document in order payload', async () => {
        // Mock customer lookup
        getSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'CUST-001', firstName: 'John', lastName: 'Doe' },
        });

        // Mock catalog search
        postSpy.mockResolvedValueOnce({
          success: true,
          data: { totalCount: 0, items: [] },
        });

        // Mock order creation
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-PAY',
            number: 'ORD-PAY-001',
            status: 'New',
            customerId: 'CUST-001',
            items: [{ id: 'LI-001', sku: 'PROD-001', name: 'Test Product', quantity: 2, price: 29.99 }],
            total: 57.48,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        await adapter.createSalesOrder(validOrderInput);

        const createCall = postSpy.mock.calls.find(
          ([url]) => url === '/api/order/customerOrders'
        );
        const payload = createCall![1];

        expect(payload.inPayments).toHaveLength(1);
        const payment = payload.inPayments[0];
        expect(payment).toMatchObject({
          currency: 'USD',
          price: 0,
          sum: 0,
          paymentStatus: 'New',
          gatewayCode: 'DefaultManualPaymentMethod',
          customerId: 'CUST-001',
          customerName: 'John Doe',
          objectType: 'PaymentIn',
        });
        expect(payment.paymentMethod).toMatchObject({
          code: 'DefaultManualPaymentMethod',
          name: 'Manual Payment',
          paymentMethodType: 0,
          isActive: true,
        });
        // Payment billing address should match order billing address
        expect(payment.billingAddress).toBeDefined();
        expect(payment.billingAddress.line1).toBe('123 Main St');
      });
    });

    describe('cancelOrder', () => {
      it('should cancel order successfully', async () => {
        // Mock GET #1: fetch the existing order
        getSpy.mockResolvedValueOnce({
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
        });

        // Mock GET #2: re-fetch after save
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            outerId: 'EXT-001',
            status: 'Cancelled',
            isCancelled: true,
            cancelledState: 'Requested',
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
            cancelledState: 'Requested',
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
      it('should update order status and shipping address', async () => {
        // Mock GET #1: fetch the existing order
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            outerId: 'EXT-001',
            status: 'New',
            customerId: 'CUST-001',
            customerName: 'John Doe',
            items: [
              { id: 'LI-001', sku: 'PROD-001', name: 'Test Product', quantity: 2, price: 29.99 },
            ],
            shipments: [
              {
                id: 'SHIP-001',
                deliveryAddress: {
                  line1: '123 Main St',
                  city: 'New York',
                  regionName: 'NY',
                  postalCode: '10001',
                  countryName: 'US',
                  name: 'John Doe',
                },
              },
            ],
            addresses: [
              {
                addressType: 'Shipping',
                line1: '123 Main St',
                city: 'New York',
                regionName: 'NY',
                postalCode: '10001',
                countryName: 'US',
              },
            ],
            total: 100.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        // Mock PUT to save the updated order
        putSpy.mockResolvedValue({
          success: true,
        });

        // Mock GET #2: re-fetch after save
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-2024-001',
            outerId: 'EXT-001',
            status: 'Processing',
            customerId: 'CUST-001',
            customerName: 'John Doe',
            items: [
              { id: 'LI-001', sku: 'PROD-001', name: 'Test Product', quantity: 2, price: 29.99 },
            ],
            shipments: [
              {
                id: 'SHIP-001',
                deliveryAddress: {
                  line1: '456 Oak Ave',
                  city: 'Los Angeles',
                  regionName: 'CA',
                  postalCode: '90001',
                  countryName: 'US',
                  name: 'Jane Smith',
                },
              },
            ],
            addresses: [
              {
                addressType: 'Shipping',
                line1: '456 Oak Ave',
                city: 'Los Angeles',
                regionName: 'CA',
                postalCode: '90001',
                countryName: 'US',
              },
            ],
            total: 100.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-02T00:00:00Z',
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
          expect(result.order.shippingAddress?.address1).toBe('456 Oak Ave');
          expect(result.order.shippingAddress?.city).toBe('Los Angeles');
        }

        expect(getSpy).toHaveBeenCalledWith('/api/order/customerOrders/ORDER-001');
        expect(putSpy).toHaveBeenCalledWith(
          '/api/order/customerOrders',
          expect.objectContaining({
            id: 'ORDER-001',
            status: 'Processing',
          })
        );
      });

      it('should update order note', async () => {
        // Mock GET #1: fetch the existing order
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-002',
            number: 'ORD-2024-002',
            status: 'New',
            comment: 'Original note',
            items: [],
            total: 50.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        putSpy.mockResolvedValue({
          success: true,
        });

        // Mock GET #2: re-fetch after save
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-002',
            number: 'ORD-2024-002',
            status: 'New',
            comment: 'Updated shipping instructions',
            items: [],
            total: 50.0,
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-02T00:00:00Z',
          },
        });

        const input: UpdateOrderInput = {
          id: 'ORDER-002',
          updates: {
            orderNote: 'Updated shipping instructions',
          },
        };

        const result = await adapter.updateOrder(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.order.orderNote).toBe('Updated shipping instructions');
        }

        expect(putSpy).toHaveBeenCalledWith(
          '/api/order/customerOrders',
          expect.objectContaining({
            comment: 'Updated shipping instructions',
          })
        );
      });

      it('should handle update failure when order not found', async () => {
        getSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
          },
        });

        const input: UpdateOrderInput = {
          id: 'INVALID-ID',
          updates: { status: 'processing' },
        };

        const result = await adapter.updateOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Order not found');
        }
      });

      it('should handle save failure', async () => {
        getSpy.mockResolvedValue({
          success: true,
          data: {
            id: 'ORDER-003',
            number: 'ORD-2024-003',
            status: 'New',
            items: [],
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        putSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status transition',
          },
        });

        const input: UpdateOrderInput = {
          id: 'ORDER-003',
          updates: { status: 'shipped' },
        };

        const result = await adapter.updateOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Failed to update order');
        }
      });

      it('should use shippingCode over shippingCarrier for shipmentMethodCode', async () => {
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-004',
            number: 'ORD-004',
            status: 'New',
            items: [],
            shipments: [{ id: 'SHIP-001', shipmentMethodCode: 'OldCode', currency: 'USD' }],
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-01T00:00:00Z',
          },
        });

        putSpy.mockResolvedValue({ success: true });

        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-004',
            number: 'ORD-004',
            status: 'New',
            items: [],
            shipments: [{ id: 'SHIP-001', shipmentMethodCode: 'FixedRateGround', currency: 'USD' }],
            currency: 'USD',
            createdDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-02T00:00:00Z',
          },
        });

        const input: UpdateOrderInput = {
          id: 'ORDER-004',
          updates: {
            shippingCarrier: 'FedEx Ground',
            shippingCode: 'FixedRateGround',
          },
        };

        await adapter.updateOrder(input);

        // shippingCode should win over shippingCarrier
        const putPayload = putSpy.mock.calls[0]?.[1] as any;
        expect(putPayload.shipments[0].shipmentMethodCode).toBe('FixedRateGround');
      });
    });

    describe('fulfillOrder', () => {
      it('should create a shipment for an order', async () => {
        // GET current order
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            number: 'ORD-001',
            status: 'Processing',
            currency: 'USD',
            items: [
              { id: 'LI-001', sku: 'BOLT-SM', name: 'Small Bolt', quantity: 5, price: 10 },
              { id: 'LI-002', sku: 'NUT-LG', name: 'Large Nut', quantity: 3, price: 5 },
            ],
            shipments: [],
          },
        });

        // PUT save
        putSpy.mockResolvedValueOnce({ success: true });

        // GET refetch after save
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            shipments: [
              {
                id: 'SHIP-NEW',
                customerOrderId: 'ORDER-001',
                status: 'New',
                trackingNumber: 'TRACK-123',
                shipmentMethodCode: 'FedEx',
                fulfillmentCenterId: 'WH-01',
                items: [
                  { lineItemId: 'LI-001', quantity: 5, lineItem: { sku: 'BOLT-SM', name: 'Small Bolt' } },
                ],
                createdDate: '2024-01-15T00:00:00Z',
                modifiedDate: '2024-01-15T00:00:00Z',
              },
            ],
          },
        });

        const input: FulfillOrderInput = {
          orderId: 'ORDER-001',
          lineItems: [{ sku: 'BOLT-SM', quantity: 5 }],
          trackingNumbers: ['TRACK-123'],
          shippingCarrier: 'FedEx',
          locationId: 'WH-01',
        };

        const result = await adapter.fulfillOrder(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.fulfillment.id).toBe('SHIP-NEW');
          expect(result.fulfillment.orderId).toBe('ORDER-001');
          expect(result.fulfillment.status).toBe('pending');
          expect(result.fulfillment.trackingNumbers).toEqual(['TRACK-123']);
          expect(result.fulfillment.lineItems).toHaveLength(1);
          expect(result.fulfillment.lineItems[0]?.sku).toBe('BOLT-SM');
        }

        expect(getSpy).toHaveBeenCalledWith('/api/order/customerOrders/ORDER-001');
        expect(putSpy).toHaveBeenCalledWith(
          '/api/order/customerOrders',
          expect.objectContaining({
            id: 'ORDER-001',
            shipments: expect.arrayContaining([
              expect.objectContaining({ shipmentMethodCode: 'FedEx' }),
            ]),
          })
        );
      });

      it('should fail when orderId is missing', async () => {
        const input: FulfillOrderInput = {
          orderId: '',
          lineItems: [{ sku: 'BOLT-SM', quantity: 1 }],
          trackingNumbers: [],
        };

        const result = await adapter.fulfillOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('orderId is required');
        }
      });

      it('should fail when order is not found', async () => {
        getSpy.mockResolvedValueOnce({ success: false });

        const input: FulfillOrderInput = {
          orderId: 'NON-EXISTENT',
          lineItems: [{ sku: 'BOLT-SM', quantity: 1 }],
          trackingNumbers: [],
        };

        const result = await adapter.fulfillOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Order not found');
        }
      });

      it('should fail when PUT save fails', async () => {
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            items: [{ id: 'LI-001', sku: 'BOLT-SM', quantity: 5 }],
            shipments: [],
          },
        });

        putSpy.mockResolvedValueOnce({ success: false, error: 'Save failed' });

        const input: FulfillOrderInput = {
          orderId: 'ORDER-001',
          lineItems: [{ sku: 'BOLT-SM', quantity: 5 }],
          trackingNumbers: [],
        };

        const result = await adapter.fulfillOrder(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Failed to create fulfillment');
        }
      });
    });

    describe('createReturn', () => {
      it('should create a return for an order', async () => {
        // GET order for line item resolution
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            items: [
              { id: 'LI-001', sku: 'BOLT-SM', name: 'Small Bolt', price: 10 },
              { id: 'LI-002', sku: 'NUT-LG', name: 'Large Nut', price: 5 },
            ],
          },
        });

        // PUT /api/return/
        putSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'RET-001' },
        });

        // GET /api/return/RET-001
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'RET-001',
            number: 'RET-2024-001',
            orderId: 'ORDER-001',
            status: 'New',
            resolution: '',
            lineItems: [
              { id: 'RLI-001', orderLineItemId: 'LI-001', quantity: 2, reason: 'Defective', price: 10 },
            ],
            createdDate: '2024-01-20T00:00:00Z',
            modifiedDate: '2024-01-20T00:00:00Z',
          },
        });

        const input: CreateReturnInput = {
          return: {
            orderId: 'ORDER-001',
            outcome: '',
            returnLineItems: [
              { orderLineItemId: 'LI-001', sku: 'BOLT-SM', quantityReturned: 2, returnReason: 'Defective' },
            ],
          },
        };

        const result = await adapter.createReturn(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.return.id).toBe('RET-001');
          expect(result.return.returnNumber).toBe('RET-2024-001');
          expect(result.return.orderId).toBe('ORDER-001');
          expect(result.return.status).toBe('requested');
          expect(result.return.returnLineItems).toHaveLength(1);
          expect(result.return.returnLineItems[0]?.sku).toBe('BOLT-SM');
          expect(result.return.returnLineItems[0]?.quantityReturned).toBe(2);
        }

        expect(putSpy).toHaveBeenCalledWith(
          '/api/return/',
          expect.objectContaining({
            orderId: 'ORDER-001',
            status: 'New',
            lineItems: expect.arrayContaining([
              expect.objectContaining({ orderLineItemId: 'LI-001', quantity: 2, reason: 'Defective' }),
            ]),
          })
        );
      });

      it('should fail when orderId is missing', async () => {
        const input: CreateReturnInput = {
          return: {
            orderId: '',
            outcome: '',
            returnLineItems: [{ orderLineItemId: 'LI-001', sku: 'X', quantityReturned: 1, returnReason: 'Broken' }],
          },
        };

        const result = await adapter.createReturn(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('orderId is required');
        }
      });

      it('should fail when order is not found', async () => {
        getSpy.mockResolvedValueOnce({ success: false });

        const input: CreateReturnInput = {
          return: {
            orderId: 'BAD-ORDER',
            outcome: '',
            returnLineItems: [{ orderLineItemId: 'LI-001', sku: 'X', quantityReturned: 1, returnReason: 'Broken' }],
          },
        };

        const result = await adapter.createReturn(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Order not found');
        }
      });

      it('should fail when PUT save fails', async () => {
        getSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'ORDER-001', items: [{ id: 'LI-001', sku: 'X', price: 10 }] },
        });

        putSpy.mockResolvedValueOnce({ success: false, error: 'Save failed' });

        const input: CreateReturnInput = {
          return: {
            orderId: 'ORDER-001',
            outcome: '',
            returnLineItems: [{ orderLineItemId: 'LI-001', sku: 'X', quantityReturned: 1, returnReason: 'Broken' }],
          },
        };

        const result = await adapter.createReturn(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Failed to create return');
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

        // externalIds should map to outerIds only, not to numbers
        expect(postSpy).toHaveBeenCalledWith(
          '/api/order/customerOrders/search',
          expect.objectContaining({ outerIds: ['EXT-001'] })
        );
        const searchCriteria = postSpy.mock.calls[0]?.[1];
        expect(searchCriteria).not.toHaveProperty('numbers');
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

      it('should convert MCP statuses to VirtoCommerce statuses in search criteria', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: { totalCount: 0, results: [] },
        });

        const input: GetOrdersInput = {
          statuses: ['pending', 'processing', 'cancelled'],
        };

        await adapter.getOrders(input);

        expect(postSpy).toHaveBeenCalledWith(
          '/api/order/customerOrders/search',
          expect.objectContaining({
            statuses: ['New', 'Processing', 'Cancelled'],
          })
        );
      });

      it('should use firstName/lastName from VC address instead of splitting name', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'ORDER-ADDR',
                number: 'ORD-ADDR-001',
                status: 'New',
                customerId: 'CUST-001',
                items: [],
                addresses: [
                  {
                    addressType: 'Shipping',
                    firstName: 'Mary',
                    lastName: 'Jane Watson',
                    name: 'MJ',
                    line1: '10 Main St',
                    city: 'Queens',
                    countryName: 'US',
                  },
                ],
                shipments: [
                  {
                    id: 'SHIP-001',
                    deliveryAddress: {
                      firstName: 'Mary',
                      lastName: 'Jane Watson',
                      name: 'MJ',
                      line1: '10 Main St',
                      city: 'Queens',
                      countryName: 'US',
                    },
                  },
                ],
                total: 0,
                currency: 'USD',
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const result = await adapter.getOrders({ ids: ['ORDER-ADDR'] });

        expect(result.success).toBe(true);
        if (result.success) {
          const order = result.orders[0]!;
          // Should use explicit firstName/lastName, not split "MJ" into "MJ"/undefined
          expect(order.shippingAddress?.firstName).toBe('Mary');
          expect(order.shippingAddress?.lastName).toBe('Jane Watson');
        }
      });

      it('should extract billing address by addressType, not first element', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'ORDER-BILL',
                number: 'ORD-BILL-001',
                status: 'New',
                customerId: 'CUST-001',
                items: [],
                addresses: [
                  {
                    addressType: 'Shipping',
                    firstName: 'Ship',
                    lastName: 'Person',
                    line1: '1 Ship St',
                    city: 'Shiptown',
                    countryName: 'US',
                  },
                  {
                    addressType: 'Billing',
                    firstName: 'Bill',
                    lastName: 'Payer',
                    line1: '2 Bill Ave',
                    city: 'Billtown',
                    countryName: 'US',
                  },
                ],
                shipments: [],
                total: 0,
                currency: 'USD',
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const result = await adapter.getOrders({ ids: ['ORDER-BILL'] });

        expect(result.success).toBe(true);
        if (result.success) {
          const order = result.orders[0]!;
          // Should pick the Billing address, not the first (Shipping) address
          expect(order.billingAddress?.firstName).toBe('Bill');
          expect(order.billingAddress?.address1).toBe('2 Bill Ave');
          expect(order.billingAddress?.city).toBe('Billtown');
        }
      });
    });

    describe('getCustomers', () => {
      it('should get customers by IDs', async () => {
        const response = readResponse('getCustomers/getCustomers');
        postSpy.mockResolvedValue({
          success: true,
          data: JSON.parse(response),
        });

        const input: GetCustomersInput = {
          ids: ['CUST-001'],
        };

        const result = await adapter.getCustomers(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.customers).toHaveLength(1);
          expect(result.customers[0]?.id).toBe('CUST-001');
          expect(result.customers[0]?.firstName).toBe('Alexander');
          expect(result.customers[0]?.lastName).toBe('Siniougin');
          expect(result.customers[0]?.email).toBe('sasha@virtoway.com');
        }
        expect(postSpy).toHaveBeenCalledWith(
          '/api/members/search',
          expect.objectContaining({
            objectIds: ['CUST-001'],
            memberTypes: ['Contact'],
            deepSearch: true,
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
        expect(postSpy).toHaveBeenCalledWith(
          '/api/members/search',
          expect.objectContaining({
            keyword: 'jane@example.com',
            memberTypes: ['Contact'],
          })
        );
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
            items: [
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
            items: [
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
            searchPhrase: 'code:BOLT-42',
            searchInVariations: true,
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
            items: [
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
            items: [
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
            items: [
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
            searchPhrase: 'code:BOLT-SM',
            searchInVariations: true,
          })
        );
      });

      it('should handle product without variations as single variant', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            items: [
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

    describe('getFulfillments', () => {
      it('should get fulfillments by order IDs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'SHIP-001',
                outerId: 'EXT-SHIP-001',
                number: 'SHP-2024-001',
                status: 'Shipped',
                customerOrderId: 'ORDER-001',
                fulfillmentCenterId: 'FC-001',
                fulfillmentCenterName: 'Main Warehouse',
                trackingNumber: '1Z999AA10123456784',
                trackingUrl: 'https://tracking.example.com/1Z999AA10123456784',
                shipmentMethodCode: 'UPS',
                shipmentMethodOption: 'Ground',
                shippingMethod: {
                  code: 'UPS',
                  name: 'UPS',
                },
                price: 12.99,
                deliveryAddress: {
                  line1: '123 Main St',
                  city: 'Springfield',
                  regionName: 'IL',
                  postalCode: '62701',
                  countryName: 'US',
                  name: 'John Doe',
                  phone: '+1234567890',
                },
                deliveryDate: '2024-01-15T00:00:00Z',
                items: [
                  {
                    id: 'SITEM-001',
                    lineItemId: 'LI-001',
                    lineItem: {
                      sku: 'BOLT-SM',
                      name: 'Stainless Steel Bolt - Small',
                    },
                    quantity: 5,
                    status: 'Shipped',
                  },
                  {
                    id: 'SITEM-002',
                    lineItemId: 'LI-002',
                    lineItem: {
                      sku: 'NUT-SM',
                      name: 'Hex Nut - Small',
                    },
                    quantity: 10,
                    status: 'Shipped',
                  },
                ],
                comment: 'Handle with care',
                createdDate: '2024-01-10T00:00:00Z',
                modifiedDate: '2024-01-12T00:00:00Z',
              },
            ],
          },
        });

        const input: GetFulfillmentsInput = {
          orderIds: ['ORDER-001'],
        };

        const result = await adapter.getFulfillments(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.fulfillments).toHaveLength(1);

          const fulfillment = result.fulfillments[0]!;
          expect(fulfillment.id).toBe('SHIP-001');
          expect(fulfillment.externalId).toBe('EXT-SHIP-001');
          expect(fulfillment.orderId).toBe('ORDER-001');
          expect(fulfillment.status).toBe('shipped');
          expect(fulfillment.trackingNumbers).toEqual(['1Z999AA10123456784']);
          expect(fulfillment.locationId).toBe('FC-001');
          expect(fulfillment.shippingCarrier).toBe('UPS');
          expect(fulfillment.shippingClass).toBe('Ground');
          expect(fulfillment.shippingCode).toBe('UPS');
          expect(fulfillment.shippingPrice).toBe(12.99);
          expect(fulfillment.shippingNote).toBe('Handle with care');
          expect(fulfillment.expectedDeliveryDate).toBe('2024-01-15T00:00:00Z');

          // Verify address mapping
          expect(fulfillment.shippingAddress).toBeDefined();
          expect(fulfillment.shippingAddress?.address1).toBe('123 Main St');
          expect(fulfillment.shippingAddress?.city).toBe('Springfield');

          // Verify line items
          expect(fulfillment.lineItems).toHaveLength(2);
          expect(fulfillment.lineItems[0]?.sku).toBe('BOLT-SM');
          expect(fulfillment.lineItems[0]?.quantity).toBe(5);
          expect(fulfillment.lineItems[1]?.sku).toBe('NUT-SM');
          expect(fulfillment.lineItems[1]?.quantity).toBe(10);
        }

        expect(postSpy).toHaveBeenCalledWith(
          '/api/order/shipments/search',
          expect.objectContaining({
            orderId: 'ORDER-001',
            responseGroup: 'Full',
          })
        );
      });

      it('should get fulfillments by IDs', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'SHIP-002',
                status: 'New',
                customerOrderId: 'ORDER-002',
                items: [],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetFulfillmentsInput = {
          ids: ['SHIP-002'],
        };

        const result = await adapter.getFulfillments(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.fulfillments).toHaveLength(1);
          expect(result.fulfillments[0]?.id).toBe('SHIP-002');
          expect(result.fulfillments[0]?.status).toBe('pending');
        }

        expect(postSpy).toHaveBeenCalledWith(
          '/api/order/shipments/search',
          expect.objectContaining({
            ids: ['SHIP-002'],
          })
        );
      });

      it('should handle empty fulfillment results', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 0,
            results: [],
          },
        });

        const input: GetFulfillmentsInput = {
          orderIds: ['NON-EXISTENT'],
        };

        const result = await adapter.getFulfillments(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.fulfillments).toHaveLength(0);
        }
      });

      it('should handle fulfillment search failure', async () => {
        postSpy.mockResolvedValue({
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Shipment service unavailable',
          },
        });

        const input: GetFulfillmentsInput = {
          orderIds: ['ORDER-001'],
        };

        const result = await adapter.getFulfillments(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      it('should map all shipment statuses correctly', async () => {
        postSpy.mockResolvedValue({
          success: true,
          data: {
            totalCount: 3,
            results: [
              {
                id: 'SHIP-A',
                status: 'ReadyToSend',
                customerOrderId: 'ORD-1',
                items: [],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 'SHIP-B',
                status: 'Delivered',
                customerOrderId: 'ORD-2',
                items: [],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 'SHIP-C',
                status: 'PickPack',
                customerOrderId: 'ORD-3',
                items: [],
                createdDate: '2024-01-01T00:00:00Z',
                modifiedDate: '2024-01-01T00:00:00Z',
              },
            ],
          },
        });

        const input: GetFulfillmentsInput = {};

        const result = await adapter.getFulfillments(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.fulfillments[0]?.status).toBe('ready_to_send');
          expect(result.fulfillments[1]?.status).toBe('delivered');
          expect(result.fulfillments[2]?.status).toBe('processing');
        }
      });
    });

    describe('getReturns', () => {
      it('should get returns by order ID', async () => {
        // POST /api/return/search
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                id: 'RET-001',
                number: 'RET-2024-001',
                orderId: 'ORDER-001',
                status: 'New',
                resolution: 'Exchange',
                lineItems: [
                  { id: 'RLI-001', orderLineItemId: 'LI-001', quantity: 2, reason: 'Defective', price: 10 },
                ],
                createdDate: '2024-01-20T00:00:00Z',
                modifiedDate: '2024-01-20T00:00:00Z',
              },
            ],
          },
        });

        // GET order for SKU enrichment
        getSpy.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'ORDER-001',
            items: [
              { id: 'LI-001', sku: 'BOLT-SM', name: 'Small Bolt', price: 10 },
            ],
          },
        });

        const input: GetReturnsInput = {
          orderIds: ['ORDER-001'],
        };

        const result = await adapter.getReturns(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.returns).toHaveLength(1);
          expect(result.returns[0]?.id).toBe('RET-001');
          expect(result.returns[0]?.orderId).toBe('ORDER-001');
          expect(result.returns[0]?.status).toBe('requested');
          expect(result.returns[0]?.outcome).toBe('Exchange');
          expect(result.returns[0]?.returnLineItems[0]?.sku).toBe('BOLT-SM');
          expect(result.returns[0]?.returnLineItems[0]?.quantityReturned).toBe(2);
        }

        expect(postSpy).toHaveBeenCalledWith(
          '/api/return/search',
          expect.objectContaining({ orderId: 'ORDER-001' })
        );
      });

      it('should handle empty results', async () => {
        postSpy.mockResolvedValueOnce({
          success: true,
          data: { totalCount: 0, results: [] },
        });

        const result = await adapter.getReturns({ orderIds: ['ORDER-NONE'] });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.returns).toHaveLength(0);
        }
      });

      it('should filter returns by status client-side', async () => {
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 2,
            results: [
              {
                id: 'RET-001', orderId: 'ORDER-001', status: 'New', lineItems: [],
                createdDate: '2024-01-20T00:00:00Z', modifiedDate: '2024-01-20T00:00:00Z',
              },
              {
                id: 'RET-002', orderId: 'ORDER-001', status: 'Completed', lineItems: [],
                createdDate: '2024-01-21T00:00:00Z', modifiedDate: '2024-01-21T00:00:00Z',
              },
            ],
          },
        });

        // GET order for enrichment (called once for ORDER-001)
        getSpy.mockResolvedValueOnce({
          success: true,
          data: { id: 'ORDER-001', items: [] },
        });

        const result = await adapter.getReturns({
          orderIds: ['ORDER-001'],
          statuses: ['completed'],
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.returns).toHaveLength(1);
          expect(result.returns[0]?.id).toBe('RET-002');
        }
      });

      it('should not double-apply skip when post-filtering is needed', async () => {
        // Return 3 items from API, 2 of which match the status filter
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 3,
            results: [
              { id: 'RET-001', orderId: 'O1', status: 'Completed', lineItems: [], createdDate: '2024-01-01T00:00:00Z', modifiedDate: '2024-01-01T00:00:00Z' },
              { id: 'RET-002', orderId: 'O1', status: 'New', lineItems: [], createdDate: '2024-01-02T00:00:00Z', modifiedDate: '2024-01-02T00:00:00Z' },
              { id: 'RET-003', orderId: 'O1', status: 'Completed', lineItems: [], createdDate: '2024-01-03T00:00:00Z', modifiedDate: '2024-01-03T00:00:00Z' },
            ],
          },
        });

        getSpy.mockResolvedValue({ success: true, data: { id: 'O1', items: [] } });

        // Request skip=1, pageSize=1 with status filter → should get RET-003 (2nd completed)
        const result = await adapter.getReturns({
          orderIds: ['O1'],
          statuses: ['completed'],
          skip: 1,
          pageSize: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.returns).toHaveLength(1);
          expect(result.returns[0]?.id).toBe('RET-003');
        }

        // Verify the API received skip=0 (not the user's skip=1)
        expect(postSpy).toHaveBeenCalledWith(
          '/api/return/search',
          expect.objectContaining({ skip: 0 })
        );
      });

      it('should handle search failure', async () => {
        postSpy.mockResolvedValueOnce({
          success: false,
          error: 'Search failed',
        });

        const result = await adapter.getReturns({ orderIds: ['ORDER-001'] });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('Failed to fetch returns');
        }
      });
    });

    describe('getInventory', () => {
      it('should get inventory for SKUs across multiple fulfillment centers', async () => {
        // Mock step 1: resolve SKUs → product IDs via catalog search
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 2,
            items: [
              { id: 'PROD-001', code: 'BOLT-SM' },
              { id: 'PROD-002', code: 'NUT-SM' },
            ],
          },
        });

        // Mock step 2: fetch product details to build SKU map
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 2,
            items: [
              { id: 'PROD-001', code: 'BOLT-SM' },
              { id: 'PROD-002', code: 'NUT-SM' },
            ],
          },
        });

        // Mock step 3: inventory search for those product IDs
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 3,
            results: [
              {
                productId: 'PROD-001',
                fulfillmentCenterId: 'FC-001',
                fulfillmentCenterName: 'Main Warehouse',
                inStockQuantity: 100,
                reservedQuantity: 15,
                status: 'Enabled',
              },
              {
                productId: 'PROD-001',
                fulfillmentCenterId: 'FC-002',
                fulfillmentCenterName: 'East Warehouse',
                inStockQuantity: 50,
                reservedQuantity: 5,
                status: 'Enabled',
              },
              {
                productId: 'PROD-002',
                fulfillmentCenterId: 'FC-001',
                fulfillmentCenterName: 'Main Warehouse',
                inStockQuantity: 200,
                reservedQuantity: 20,
                status: 'Enabled',
              },
            ],
          },
        });

        const input: GetInventoryInput = {
          skus: ['BOLT-SM', 'NUT-SM'],
        };

        const result = await adapter.getInventory(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.inventory).toHaveLength(3);

          // BOLT-SM at Main Warehouse
          const boltMain = result.inventory.find(
            (i) => i.sku === 'BOLT-SM' && i.locationId === 'FC-001'
          );
          expect(boltMain).toBeDefined();
          expect(boltMain?.available).toBe(85); // 100 - 15
          expect(boltMain?.onHand).toBe(100);
          expect(boltMain?.unavailable).toBe(15);

          // BOLT-SM at East Warehouse
          const boltEast = result.inventory.find(
            (i) => i.sku === 'BOLT-SM' && i.locationId === 'FC-002'
          );
          expect(boltEast).toBeDefined();
          expect(boltEast?.available).toBe(45); // 50 - 5

          // NUT-SM at Main Warehouse
          const nutMain = result.inventory.find(
            (i) => i.sku === 'NUT-SM' && i.locationId === 'FC-001'
          );
          expect(nutMain).toBeDefined();
          expect(nutMain?.available).toBe(180); // 200 - 20
        }

        // Verify SKU resolution was called first
        expect(postSpy).toHaveBeenNthCalledWith(
          1,
          '/api/catalog/search/products',
          expect.objectContaining({
            searchPhrase: 'code:BOLT-SM,NUT-SM',
            searchInVariations: true,
          })
        );

        // Verify inventory search was called third
        expect(postSpy).toHaveBeenNthCalledWith(
          3,
          '/api/inventory/search',
          expect.objectContaining({
            productIds: ['PROD-001', 'PROD-002'],
          })
        );
      });

      it('should filter inventory by location IDs', async () => {
        // Mock step 1: resolve SKUs
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 1,
            items: [{ id: 'PROD-001', code: 'BOLT-SM' }],
          },
        });

        // Mock step 2: fetch product details
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 1,
            items: [{ id: 'PROD-001', code: 'BOLT-SM' }],
          },
        });

        // Mock step 3: inventory search
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 1,
            results: [
              {
                productId: 'PROD-001',
                fulfillmentCenterId: 'FC-002',
                inStockQuantity: 50,
                reservedQuantity: 5,
              },
            ],
          },
        });

        const input: GetInventoryInput = {
          skus: ['BOLT-SM'],
          locationIds: ['FC-002'],
        };

        const result = await adapter.getInventory(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.inventory).toHaveLength(1);
          expect(result.inventory[0]?.locationId).toBe('FC-002');
        }

        expect(postSpy).toHaveBeenNthCalledWith(
          3,
          '/api/inventory/search',
          expect.objectContaining({
            fulfillmentCenterIds: ['FC-002'],
          })
        );
      });

      it('should return empty inventory when SKUs not found in catalog', async () => {
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 0,
            items: [],
          },
        });

        const input: GetInventoryInput = {
          skus: ['NON-EXISTENT'],
        };

        const result = await adapter.getInventory(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.inventory).toHaveLength(0);
        }

        // Should NOT call inventory search if no products found
        expect(postSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle catalog search failure', async () => {
        postSpy.mockResolvedValueOnce({
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Catalog service unavailable',
          },
        });

        const input: GetInventoryInput = {
          skus: ['BOLT-SM'],
        };

        const result = await adapter.getInventory(input);

        // resolveSkuProductMap swallows the error and returns empty map,
        // so getInventory returns success with empty inventory
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.inventory).toHaveLength(0);
        }
      });

      it('should handle inventory search failure', async () => {
        // Mock step 1: resolve SKUs
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 1,
            items: [{ id: 'PROD-001', code: 'BOLT-SM' }],
          },
        });

        // Mock step 2: fetch product details
        postSpy.mockResolvedValueOnce({
          success: true,
          data: {
            totalCount: 1,
            items: [{ id: 'PROD-001', code: 'BOLT-SM' }],
          },
        });

        // Mock step 3: inventory search fails
        postSpy.mockResolvedValueOnce({
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Inventory service unavailable',
          },
        });

        const input: GetInventoryInput = {
          skus: ['BOLT-SM'],
        };

        const result = await adapter.getInventory(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.message).toContain('fetch inventory');
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
      getSpy.mockResolvedValue({ success: false });
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
          customer: { id: 'CUST-001' },
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
