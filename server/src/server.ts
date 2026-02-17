/**
 * MCP Server using SDK components
 * This is the recommended approach for MCP servers
 */

import { randomUUID } from 'node:crypto';
import * as http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  PingRequestSchema,
  McpError,
  ErrorCode,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './tools/registry.js';
import { ServiceOrchestrator } from './services/service-orchestrator.js';
import { ServerConfig } from './types/index.js';
import { Logger } from './utils/logger.js';
import { ErrorAdapter, createSuccessResponse } from './errors/error-adapter.js';

export class MCPServerSDK {
  private server: Server;
  private serviceOrchestrator: ServiceOrchestrator;
  private toolRegistry: ToolRegistry;
  private config: ServerConfig;
  private httpServer?: http.Server;
  private sseTransports: Map<string, SSEServerTransport> = new Map();
  private streamableTransports: Map<string, StreamableHTTPServerTransport> = new Map();

  constructor(config: ServerConfig) {
    this.config = config;

    this.server = this.createServer();
    this.serviceOrchestrator = new ServiceOrchestrator();
    this.toolRegistry = new ToolRegistry(this.serviceOrchestrator);
  }

  /** Create a new MCP Server instance with all handlers wired up. */
  private createServer(): Server {
    const server = new Server(
      {
        name: this.config.server.name,
        version: this.config.server.version,
        description: this.config.server.description,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      }
    );

    this.setupHandlers(server);
    return server;
  }

  private setupHandlers(server: Server): void {
    // Handle tools/list requests
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      Logger.debug('Handling tools/list request');
      const tools = this.toolRegistry.list();
      return { tools };
    });

    // Handle tools/call requests with improved response wrapping
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      Logger.debug(`Handling tools/call request for: ${name}`);

      if (!this.toolRegistry.has(name)) {
        Logger.error(`Unknown tool requested: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`, { name });
      }

      try {
        const result = await this.toolRegistry.execute(name, args || {});
        return createSuccessResponse(result);
      } catch (error) {
        Logger.debug(`Processing error for tool ${name}:`, error);

        // Use error adapter to determine how to handle the error
        const processed = ErrorAdapter.processError(error as Error);

        if (processed.shouldThrow && processed.mcpError) {
          // Protocol errors should be thrown to let MCP SDK handle them
          Logger.error(`Protocol error for tool ${name}:`, error);
          throw processed.mcpError;
        } else if (processed.toolResponse) {
          // Tool execution errors should be returned as error responses
          Logger.error(`Tool execution failed: ${name}`, error);
          return processed.toolResponse;
        } else {
          // Fallback case
          Logger.error(`Unexpected error handling for tool ${name}:`, error);
          throw error;
        }
      }
    });

    // Handle ping requests
    server.setRequestHandler(PingRequestSchema, async () => {
      Logger.debug('Handling ping request');
      return {};
    });

    // Handle prompts/list requests - return empty list since we don't support prompts
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      Logger.debug('Handling prompts/list request');
      return { prompts: [] };
    });

    // Handle resources/list requests - return empty list since we don't support resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      Logger.debug('Handling resources/list request');
      return { resources: [] };
    });

    // Handle any other custom requests if needed
    server.onerror = (error) => {
      Logger.error('Server error:', error);
    };
  }

  async start(): Promise<void> {
    Logger.info('Starting MCP server with SDK transport...');

    await this.serviceOrchestrator.initialize(this.config.adapter);
    await this.registerTools();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    Logger.info('MCP server running on stdio transport');
  }

  async startSSE(port: number): Promise<void> {
    Logger.info('Starting MCP server with SSE transport...');

    await this.serviceOrchestrator.initialize(this.config.adapter);
    await this.registerTools();

    this.httpServer = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/sse' && req.method === 'GET') {
        // Disable nginx buffering so SSE events are forwarded immediately
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        // New SSE connection
        const transport = new SSEServerTransport('/messages', res);
        this.sseTransports.set(transport.sessionId, transport);
        Logger.info(`SSE client connected: ${transport.sessionId}`);

        // Periodic keep-alive to prevent proxy/nginx from dropping idle connections
        const pingInterval = setInterval(() => {
          try {
            res.write(':ping\n\n');
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);

        transport.onclose = () => {
          clearInterval(pingInterval);
          this.sseTransports.delete(transport.sessionId);
          Logger.info(`SSE client disconnected: ${transport.sessionId}`);
        };

        await this.server.connect(transport);
        return;
      }

      if (url.pathname === '/messages' && req.method === 'POST') {
        // Route POST to the correct session
        const sessionId = url.searchParams.get('sessionId');
        const transport = sessionId ? this.sseTransports.get(sessionId) : undefined;

        if (!transport) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid or missing sessionId' }));
          return;
        }

        await transport.handlePostMessage(req, res);
        return;
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'sse', sessions: this.sseTransports.size }));
        return;
      }

      Logger.info('MCP server received unknown request', { method: req.method, url: req.url });

      res.writeHead(404);
      res.end();
    });

    this.httpServer.listen(port, () => {
      Logger.info(`MCP server running on SSE transport at http://0.0.0.0:${port}/sse`);
    });
  }

  async startStreamableHTTP(port: number): Promise<void> {
    Logger.info('Starting MCP server with Streamable HTTP transport...');

    await this.serviceOrchestrator.initialize(this.config.adapter);
    await this.registerTools();

    this.httpServer = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, last-event-id');
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', transport: 'streamable-http', sessions: this.streamableTransports.size }));
        return;
      }

      if (url.pathname !== '/mcp') {
        res.writeHead(404);
        res.end();
        return;
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (req.method === 'POST') {
        // Read request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString());

        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.streamableTransports.has(sessionId)) {
          transport = this.streamableTransports.get(sessionId)!;
        } else if (!sessionId && isInitializeRequest(body)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
              this.streamableTransports.set(id, transport);
              Logger.info(`Streamable HTTP session initialized: ${id}`);
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
              this.streamableTransports.delete(sid);
              Logger.info(`Streamable HTTP session closed: ${sid}`);
            }
          };

          const server = this.createServer();
          await server.connect(transport);
          await transport.handleRequest(req, res, body);
          return;
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: null }));
          return;
        }

        await transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === 'GET') {
        if (!sessionId || !this.streamableTransports.has(sessionId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
          return;
        }
        const transport = this.streamableTransports.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }

      if (req.method === 'DELETE') {
        if (!sessionId || !this.streamableTransports.has(sessionId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
          return;
        }
        const transport = this.streamableTransports.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }

      res.writeHead(405);
      res.end();
    });

    this.httpServer.listen(port, () => {
      Logger.info(`MCP server running on Streamable HTTP transport at http://0.0.0.0:${port}/mcp`);
    });
  }

  private async registerTools(): Promise<void> {
    Logger.debug('Registering Fulfillment tools...');

    // Initialize the tool registry to auto-discover and register all tools
    await this.toolRegistry.initialize();

    const tools = this.toolRegistry.list();
    Logger.info(`Registered ${tools.length} tools`);
  }

  async stop(): Promise<void> {
    Logger.info('Stopping MCP server...');

    // Cleanup service orchestrator first
    await this.serviceOrchestrator.cleanup();

    // Close all SSE transports
    for (const transport of this.sseTransports.values()) {
      await transport.close();
    }
    this.sseTransports.clear();

    // Close all Streamable HTTP transports
    for (const transport of this.streamableTransports.values()) {
      await transport.close();
    }
    this.streamableTransports.clear();

    // Close HTTP server if running
    if (this.httpServer) {
      await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
    }

    // Disconnect the MCP server properly
    if (this.server) {
      await this.server.close();
    }

    Logger.info('MCP server stopped successfully');
  }
}
