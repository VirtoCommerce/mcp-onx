# Universal OMS MCP Server - Test Prompts

Copy and paste these prompts into Claude Desktop to test each MCP tool. The mock adapter has pre-populated test data you can reference.

## Test Data Reference

### Available Orders
- **95bee1c2-f6b6-4eef-b9fd-df260b980d71** / CO220518-00001: 
  - Status=new 
  - Customer=b2b admin, 
  - Product=Brother MFC-L6700DW Wireless Monochrome All-in-One Laser Printer, Copy/Fax/Print/Scan
- **9eebb423-619b-4fcb-a52e-82e367ae37cc** / CO220715-00001:
  - Status=processing 
  - Customer=b2b admin, 
  - Products
    - Epson Expression Premium XP-820 Wireless Color Photo Printer/Copier/Scanner/Fax Machine
    - Epson Expression Premium XP-830 All-In-One Wireless Printer
- todo: add more orders with different statuses, customers, and products for comprehensive testing

### Available Customers
- **cb0a5340-f9fb-4f49-bd62-9d03518868ff**: b2b admin (b2badmin@test.com, VIP, Wholesaler)
- **fa90d0b3-4bf5-4fc8-8c7c-787cafc4c678**: Alla Volkova (allagrvolkova@mail.ru)

### Available Products/SKUs
- **47e4aaef9c9e4326924d4a4080f461a5** / 564698896: Brother MFC-L6700DW Wireless Monochrome All-in-One Laser Printer, Copy/Fax/Print/Scan, $539
- **08c33cfc9f664426a52fac8882da2df0** / 566903892: Canon Imageclass WiFi MF232W Monochrome Laser Printer/Scanner/Copier, $189
- **6ee23bd045a549d785d9abc7e2a61b02** / 552223579: HP LaserJet Pro MFP M127fn Multifunction Laser Printer, Copy/Fax/Print/Scan, $315

### Warehouse Locations
- vendor-fulfillment

---

## Query Tools Test Prompts

### 1. Get Order Tool

```
Get me the details for order CO220518-00001
```

:white_check_mark: Passed - returns order details for CO220518-00001

```
Show me order 95bee1c2-f6b6-4eef-b9fd-df260b980d71 
```

:white_check_mark: Passed - returns order details

```
What's the status of order CO220715-00001?
```

:white_check_mark: Passed - returns "processing"

```
Can you retrieve order CO220715-00001 and show me all details?
```

:white_check_mark: Passed - returns full order details including products and customer info

### 2. Get Customer Tool

```
Get customer information for cb0a5340-f9fb-4f49-bd62-9d03518868ff
```

:white_check_mark: Passed - returns customer details for b2b admin

```
Show me the details for customer allagrvolkova@mail.ru
```

:white_check_mark: Passed - returns customer details for Alla Volkova

```
Find customer cb0a5340-f9fb-4f49-bd62-9d03518868ff
```

:white_check_mark: Passed - returns customer details for b2b admin

```
What information do you have on customer b2badmin@test.com
```

:white_check_mark: Passed - returns no customer found (since it doesn't exist in test data)

### 3. Get Product Tool

```
Show me product details for SKU 566903892
```

:white_check_mark: Passed - returns product details for 08c33cfc9f664426a52fac8882da2df0

```
Get information about product 08c33cfc9f664426a52fac8882da2df0
```

:white_check_mark: Passed - returns product details

```
What are the details for the printer product 4b729fae613046448aaba7c265bb4f2d?
```

:white_check_mark: Passed - returns product details for the printer

```
Find product 47e4aaef9c9e4326924d4a4080f461a5 and show me all its attributes
```

:white_check_mark: Passed - returns product details


### 4. Get Inventory Tool

```
Check inventory for SKU 566903892 at warehouse vendor-fulfillment
```

:white_check_mark: Passed - returns inventory levels for SKU 566903892 at vendor-fulfillment

```
What's the available stock for 566903892 in location vendor-fulfillment?
```

:white_check_mark: Passed - returns available stock for SKU 566903892 in location vendor-fulfillment

```
Show me inventory levels for 566903892 across all warehouses
```

:white_check_mark: Passed - returns inventory levels for SKU 566903892 across all warehouses

```
Get inventory status for 566903892 at vendor-fulfillment
```

:white_check_mark: Passed - returns inventory status for SKU 566903892 at vendor-fulfillment


### 5. Get Shipment Tool

```
Get shipment details for order CO220518-00001
```

:white_check_mark: Passed - returns shipment details for order CO220518-00001

```
Show me the shipment information for order CO220518-00001
```

:white_check_mark: Passed - returns shipment information for order CO220518-00001

```
Check if CO220518-00001 has been shipped
```

:white_check_mark: Passed - returns shipment status ("not shipped")

```
Find shipment tracking for order CO220518-00001
```

:white_check_mark: Passed - returns shipment tracking for order CO220518-00001

### 6. Get Buyer Tool

```
Get buyer information for order CO220518-00001
```

:white_check_mark: Passed - returns buyer information for order CO220518-00001

```
Who is the buyer for order CO220518-00001?
```

:white_check_mark: Passed - returns buyer name and contact info for order CO220518-00001

```
Show me the buyer details for order CO220518-00001
```

:white_check_mark: Passed - returns buyer details for order CO220518-00001

```
Find the customer who placed order CO220518-00001
```

:white_check_mark: Passed - returns customer details for b2b admin

## Action Tools Test Prompts

### 7. Capture Order Tool

```
Create a new order for customer cb0a5340-f9fb-4f49-bd62-9d03518868ff with 2 units of 47e4aaef9c9e4326924d4a4080f461a5 shipping to 123 Main St, New York, NY 10001
```

:white_check_mark: Passed - creates new order for b2b admin with specified products and shipping address

```
Capture an order for allagrvolkova@mail.ru with 1 566903892 and 2 552223579 items
```

:white_check_mark: Passed - creates new order for Alla Volkova with specified products

```
Place an order for customer b2b admin with product 08c33cfc9f664426a52fac8882da2df0, quantity 1, shipping to 456 Oak Ave, Los Angeles, CA 90210
```

:white_check_mark: Passed - creates new order for b2b admin with specified product and shipping address


### 8. Cancel Order Tool

```
Cancel order ORDER-NY-001 due to customer request
```

:white_check_mark: Passed - cancels order ORDER-NY-001

```
Please cancel order TEST-ORDER-007 - the customer changed their mind
```

:white_check_mark: Passed - cancels order TEST-ORDER-007

```
Cancel order 8676953f-8728-4719-9c0f-d243422da361 because of inventory issues
```

:white_check_mark: Passed - cancels order 8676953f-8728-4719-9c0f-d243422da361

### 9. Update Order Tool

```
Update order ORDER-LA-001 to change the quantity of 566903892 to 3 units
```

:white_check_mark: Passed - updates order ORDER-LA-001 to change quantity of 566903892 to 3 units

```
Modify order ORDER-LA-001 to ship to 789 Broadway, New York, NY 10002 instead
```

:white_check_mark: Passed - updates order ORDER-LA-001 to change shipping address to 789 Broadway, New York, NY 10002

```
Update order ORDER-LA-001 with express shipping
```

:note:

### 10. Return Order Tool

```
Process a return for order ORDER-B2B-002 - customer says the coffee tastes bad
```
:white_check_mark: Passed - creates return for order ORDER-B2B-002 with reason "customer says the coffee tastes bad"

```
Create a return for order WEB-2024-1002 with reason "damaged during shipping"
```

```
Return order order_001 because the headphones don't work
```

### 11. Exchange Order Tool
```
Exchange order order_001 - customer wants TSH-002 instead of WID-001
```
```
Process an exchange for order ORD-1001 - swap the t-shirt for coffee beans
```
```
Exchange the items in order_002 for different products
```

### 12. Ship Order Tool
```
Mark order order_001 as shipped with tracking number TRK123456789
```
```
Ship order EXT-001 via FedEx with tracking FDX987654321
```
```
Process shipment for order_002 using UPS tracking 1Z999AA10123456784
```

---

## Management Tools Test Prompts

### 13. Hold Order Tool
```
Put order order_001 on hold - waiting for payment verification
```
```
Hold order EXT-001 due to address verification needed
```
```
Place a hold on order_002 for customer service review
```
```
Release the hold on order ORD-1001
```

### 14. Split Order Tool
```
Split order order_002 so that 1 TSH-002 ships immediately and the other ships later
```
```
I need to split order_001 into two separate shipments
```
```
Divide order WEB-2024-1002 - send 2 coffee bags now and 1 later
```

### 15. Reserve Inventory Tool
```
Reserve 5 units of WID-001 from warehouse WH001
```
```
Hold 10 units of TSH-002 inventory at location WH002 for a special customer
```
```
Reserve 3 COF-003 from WH003 for upcoming order
```
```
Release the reservation on 2 units of WID-001 at WH001
```

---

## Complex Workflow Test Prompts

### Multi-Tool Operations
```
Get order order_001, then check inventory for all its items, and finally ship it with tracking ABC123
```
```
Find customer cust_002, show me all their orders, and then check product availability for TSH-002
```
```
Create a new order for john.smith@example.com with 2 WID-001, then put it on hold for payment verification
```

### Error Handling Tests
```
Get order INVALID_ORDER_ID
```
```
Cancel an order that doesn't exist: order_999
```
```
Check inventory for a non-existent SKU: FAKE-SKU-001
```
```
Get customer information for unknown@email.com
```

### Business Logic Tests
```
Cancel order order_003 (note: it's already shipped - should fail)
```
```
Ship order order_001 twice (should handle duplicate shipment)
```
```
Reserve 1000 units of WID-001 (likely exceeds available inventory)
```

---

## Notes for Testing

1. The mock adapter includes realistic delays (50-200ms) to simulate network latency
2. There's a 1% error rate configured to occasionally test error handling
3. All timestamps are automatically generated relative to current date
4. Custom fields are preserved and returned in responses
5. The mock data persists during the session but resets on server restart

## Expected Responses

- Successful queries should return detailed JSON objects with all fields
- Failed operations should return clear error messages with reasons
- The server logs to stderr, so you'll see debug information in the server console
- All tools validate required fields and will reject invalid requests

## Troubleshooting

If a tool doesn't work as expected:
1. Check that the order/customer/product ID exists in the test data
2. Verify the status allows the operation (e.g., can't ship an already shipped order)
3. Look for validation errors in the response
4. Check server logs for detailed error information