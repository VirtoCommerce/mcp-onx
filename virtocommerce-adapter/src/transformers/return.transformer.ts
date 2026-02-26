/**
 * Return transformation utilities
 * Bidirectional mapping between VirtoCommerce Return models and MCP Return format
 */

import type { Return, ReturnLineItem, CreateReturnInput } from '@virtocommerce/cof-mcp';
import type { VcReturn, VcReturnLineItem, CustomerOrder, LineItem } from '../models/index.js';
import { BaseTransformer } from './base.js';

/**
 * VC Return status → MCP normalized status
 */
const RETURN_STATUS_MAP: Record<string, string> = {
  New: 'requested',
  Approved: 'approved',
  Processing: 'processing',
  Completed: 'completed',
  Canceled: 'cancelled',
};

/**
 * MCP normalized status → VC Return status
 */
const REVERSE_RETURN_STATUS_MAP: Record<string, string> = {
  requested: 'New',
  pending: 'New',
  approved: 'Approved',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Canceled',
  canceled: 'Canceled',
  declined: 'Canceled',
};

export class ReturnTransformer extends BaseTransformer {
  /**
   * Transform a VirtoCommerce Return to MCP Return format
   */
  toMcpReturn(vcReturn: VcReturn, order?: CustomerOrder): Return {
    const orderItems = order?.items ?? vcReturn.order?.items ?? [];

    return {
      id: vcReturn.id ?? '',
      returnNumber: vcReturn.number,
      orderId: vcReturn.orderId ?? '',
      status: this.mapReturnStatus(vcReturn.status),
      outcome: vcReturn.resolution ?? '',
      returnLineItems: (vcReturn.lineItems ?? []).map((item) => this.toMcpReturnLineItem(item, orderItems)),
      createdAt: vcReturn.createdDate ?? this.now(),
      updatedAt: vcReturn.modifiedDate ?? this.now(),
      requestedAt: vcReturn.createdDate,
      tenantId: this.tenantId,
    };
  }

  /**
   * Transform multiple VirtoCommerce Returns to MCP format
   */
  toMcpReturns(vcReturns: VcReturn[], orderMap: Map<string, CustomerOrder>): Return[] {
    return vcReturns.map((vcReturn) => {
      const order = vcReturn.orderId ? orderMap.get(vcReturn.orderId) : undefined;
      return this.toMcpReturn(vcReturn, order);
    });
  }

  /**
   * Transform a VirtoCommerce ReturnLineItem to MCP ReturnLineItem format
   */
  private toMcpReturnLineItem(vcItem: VcReturnLineItem, orderItems: LineItem[]): ReturnLineItem {
    const orderLineItem = orderItems.find((li) => li.id === vcItem.orderLineItemId);

    return {
      id: vcItem.id,
      orderLineItemId: vcItem.orderLineItemId ?? '',
      sku: orderLineItem?.sku ?? '',
      quantityReturned: vcItem.quantity ?? 0,
      returnReason: vcItem.reason ?? 'unknown',
      unitPrice: vcItem.price,
      name: orderLineItem?.name,
    };
  }

  /**
   * Transform MCP CreateReturnInput to VirtoCommerce Return for the PUT /api/return/ endpoint
   */
  fromCreateReturnInput(input: CreateReturnInput, order: CustomerOrder): VcReturn {
    const orderItems = order.items ?? [];

    return {
      orderId: input.return.orderId,
      status: this.reverseMapReturnStatus(input.return.status) ?? 'New',
      resolution: input.return.outcome,
      lineItems: (input.return.returnLineItems ?? []).map((item) => {
        const orderLineItem = orderItems.find(
          (li) => li.id === item.orderLineItemId || li.sku === item.sku
        );

        return {
          orderLineItemId: item.orderLineItemId ?? orderLineItem?.id,
          quantity: item.quantityReturned,
          reason: item.returnReason,
          price: item.unitPrice ?? orderLineItem?.price ?? 0,
        };
      }),
    };
  }

  /**
   * Map VC Return status to MCP normalized status
   */
  private mapReturnStatus(status?: string): string {
    if (!status) {
      return 'requested';
    }
    return RETURN_STATUS_MAP[status] ?? status.toLowerCase();
  }

  /**
   * Map MCP normalized status to VC Return status
   */
  private reverseMapReturnStatus(status?: string): string | undefined {
    if (!status) {
      return undefined;
    }
    return REVERSE_RETURN_STATUS_MAP[status] ?? undefined;
  }
}
