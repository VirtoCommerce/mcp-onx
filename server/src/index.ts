#!/usr/bin/env node

/**
 * Order Network eXchange MCP Server - SDK Version
 * Entry point using MCP SDK components
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { ConfigManager } from './config/config-manager.js';
import { MCPServerSDK } from './server.js';
import { Logger } from './utils/logger.js';
import { RetryHandler } from './utils/retry.js';
import { Sanitizer } from './utils/sanitizer.js';
import { TimeoutHandler } from './utils/timeout.js';

async function main() {
  try {
    // Ensure stdout stays чистым для MCP JSON-RPC.
    console.log = console.error;
    console.info = console.error;
    console.warn = console.error;
    console.debug = console.error;

    // Load .env files before config initialization (local overrides default).
    const envPath = path.join(process.cwd(), '.env');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true });
    }

    // Initialize logger with safe defaults before config loading
    Logger.init('info');

    // Load configuration
    const configManager = ConfigManager.getInstance();
    const config = configManager.getAll();

    // Re-initialize logger with config values and structured logging if needed
    Logger.init(config.logging.level as any, true, {
      level: config.logging.level,
      dir: config.logging.dir,
    });

    // Configure utilities with config values
    RetryHandler.setConfig(config.resilience.retry);
    Sanitizer.setConfig(config.security.sanitization);
    TimeoutHandler.setConfig(config.performance.timeout);

    Logger.info('Starting Order Network eXchange MCP Server (SDK version)...');

    // Create and start server
    const server = new MCPServerSDK(config);

    const transport = process.env.MCP_TRANSPORT || 'stdio';
    const port = parseInt(process.env.MCP_PORT || '3000', 10);
    if (transport === 'http') {
      await server.startStreamableHTTP(port);
    } else if (transport === 'sse') {
      await server.startSSE(port);
    } else {
      await server.start();
    }

    // Handle graceful shutdown
    const shutdown = async () => {
      Logger.info('Shutting down server...');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // The SDK transport keeps the process alive, no need for setInterval
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
// ES modules use import.meta.url
const __filename = fileURLToPath(import.meta.url);

// Check if this file was run directly
if (process.argv[1] === __filename) {
  main();
}

export { MCPServerSDK } from './server.js';
export { ConfigManager } from './config/config-manager.js';
export * from './types/index.js';
export * from './schemas/index.js';
