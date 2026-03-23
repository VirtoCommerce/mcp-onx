# [Your Backend] Capabilities

This document defines the MCP server capabilities for your backend integration.
It follows the generic MCP adapter principles defined in [CLAUDE.md](../../CLAUDE.md).

---

## Canonical Tool List

These operations define the full surface area of the MCP specification for this backend integration.

The MCP server MUST NOT introduce additional methods, rename existing ones, or change their semantics.
Each method maps directly to a backend functionality, e.g. API endpoints as described below.

---

### Actions (Write Operations)

These operations modify state in the backend.
Claude should use them only when the user explicitly requests a state-changing operation.

- **createSalesOrder(input)**
  Maps to: `POST /api/orders`
  Creates a new sales order in the backend.

- **cancelOrder(input)**
  Maps to: `POST /api/orders/:id/cancel`
  Cancels an existing order.

- **updateOrder(input)**
  Maps to: `PATCH /api/orders/:id`
  Updates fields of an existing order.

> Note: Additional action methods may be implemented in future iterations.

---

### Queries (Read Operations)

These operations retrieve data from the backend and MUST NOT modify state.

- **getOrders(input)**
  Maps to: `GET /api/orders/:id`
  Retrieves order details.

> Note: Additional query methods may be implemented in future iterations.

---

## Usage Rules for Claude

- Claude MUST use these methods as the only valid tool interface for interacting with this backend.
- Claude MUST NOT invent new methods or assume additional capabilities.
- Claude MUST choose the correct method based on user intent (read vs. write).
- Claude MUST follow all error-handling rules defined in the linked error documentation.
- Claude MUST NOT attempt to bypass the MCP server or call backend endpoints directly.

---

## Error Documentation

The MCP server must propagate backend errors transparently and never attempt to repair or complete invalid requests.

| Operation | Error Reference |
|-----------|-----------------|
| Create order | [Link to error documentation] |
| Cancel order | [Link to error documentation] |
| Update order | [Link to error documentation] |
| Get order | [Link to error documentation] |

> Note: Replace these with links to your actual error documentation.

---

## Related Documentation

- [Link to your backend API documentation]
- [Link to authentication documentation]
- [Link to additional resources]
