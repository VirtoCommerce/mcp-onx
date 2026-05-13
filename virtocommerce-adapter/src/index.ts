/**
 * Main entry point for VirtoCommerce adapter
 *
 * The adapter factory expects a default export of the adapter class.
 * Additional exports are optional for direct usage.
 */

// Default export for the adapter factory to load
import { VirtoCommerceFulfillmentAdapter } from './adapter.js';
export default VirtoCommerceFulfillmentAdapter;

// Named export for direct usage
export { VirtoCommerceFulfillmentAdapter } from './adapter.js';

// Export types
export type { AdapterOptions } from './types.js';
export { ErrorCode, STATUS_MAP } from './types.js';

// Export transformers for extensibility
export * from './transformers/index.js';

// Export services for extensibility
export * from './services/index.js';

// Export mappers for extensibility
export * from './mappers/index.js';
