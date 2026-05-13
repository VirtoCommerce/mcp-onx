/**
 * Base transformer utilities shared across all transformers
 */

export abstract class BaseTransformer {
  protected tenantId: string;

  constructor(tenantId: string = 'default-workspace') {
    this.tenantId = tenantId;
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  protected now(): string {
    return new Date().toISOString();
  }

  protected ensureArray<T>(data: T | T[] | undefined | null): T[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : [data];
  }

  protected valueOrUndefined<T>(value: T | null | undefined): T | undefined {
    return value ?? undefined;
  }

  protected composeName(firstName?: string | null, lastName?: string | null): string | undefined {
    const parts = [firstName, lastName]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((value) => value.trim());

    return parts.length ? parts.join(' ') : undefined;
  }

  protected splitName(name?: string | null): { firstName?: string; lastName?: string } {
    if (!name) {
      return {};
    }

    const parts = name.trim().split(/\s+/);
    if (!parts.length) {
      return {};
    }

    if (parts.length === 1) {
      return { firstName: parts[0] };
    }

    return {
      firstName: parts.shift(),
      lastName: parts.join(' '),
    };
  }
}
