/**
 * HTTP/SSE Server for Tanuki MCP
 * Provides HTTP transport with Server-Sent Events for Smithery deployment
 */

import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { createTanukiServer } from './server.js';
import { FastMCP } from 'fastmcp';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS for all routes (required for Smithery)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Load tools manifest for instant serving
let toolsManifest: any = null;
try {
  const manifestPath = path.join(process.cwd(), 'tools-manifest.json');
  if (existsSync(manifestPath)) {
    toolsManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    console.log('📋 Loaded tools manifest for instant serving');
  }
} catch (error) {
  console.warn('⚠️ Could not load tools manifest:', error);
}

// Initialize FastMCP server for tool execution
let mcpServer: FastMCP | null = null;
try {
  // Ensure tools are registered by disabling tool scan mode for HTTP
  process.env.SMITHERY_TOOL_SCAN = 'false';
  mcpServer = createTanukiServer();
  console.log('🛠️ FastMCP server initialized for HTTP mode');
  
  // Debug: Check if tools are registered
  const tools = (mcpServer as any)._tools || new Map();
  console.log(`📋 Registered ${tools.size} tools for HTTP bridge:`, Array.from(tools.keys()));
} catch (error) {
  console.error('❌ Failed to initialize FastMCP server:', error);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    mode: 'http', 
    timestamp: new Date().toISOString(),
    tools: toolsManifest?.tools?.length || 0
  });
});

// SSE endpoint - instantly serves tool manifest and maintains connection
app.get('/sse', (req, res) => {
  console.log('🔌 New SSE connection established');
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Instantly send tools manifest if available
  if (toolsManifest) {
    const manifestData = JSON.stringify({
      jsonrpc: "2.0",
      result: toolsManifest
    });
    res.write(`data: ${manifestData}\n\n`);
    console.log('⚡ Tool manifest sent instantly via SSE');
  }

  // Send periodic keepalive pings
  const pingInterval = setInterval(() => {
    res.write(`: keepalive ${new Date().toISOString()}\n\n`);
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    console.log('🔌 SSE connection closed');
    clearInterval(pingInterval);
  });

  req.on('error', (error) => {
    console.error('❌ SSE connection error:', error);
    clearInterval(pingInterval);
  });
});

// Tool execution endpoint
app.post('/messages', async (req, res) => {
  try {
    console.log('🔧 Received tool execution request:', req.body);
    
    const { method, params } = req.body;
    
    if (method === 'tools/list') {
      // Return tools list
      if (toolsManifest) {
        res.json({
          jsonrpc: "2.0",
          id: req.body.id,
          result: toolsManifest
        });
      } else {
        res.status(500).json({
          jsonrpc: "2.0",
          id: req.body.id,
          error: { code: -32000, message: "Tools manifest not available" }
        });
      }
      return;
    }
    
    if (method === 'tools/call') {
      // Execute tool via HTTP bridge
      const { name, arguments: toolArgs } = params;
      
      try {
        // Bridge to FastMCP tool execution
        const result = await executeToolViaHTTP(name, toolArgs);
        
        res.json({
          jsonrpc: "2.0",
          id: req.body.id,
          result: {
            content: [
              {
                type: "text",
                text: result
              }
            ]
          }
        });
        
        console.log(`✅ Tool ${name} executed successfully via HTTP`);
      } catch (error) {
        console.error(`❌ Tool ${name} execution failed:`, error);
        res.status(500).json({
          jsonrpc: "2.0",
          id: req.body.id,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : String(error)
          }
        });
      }
      return;
    }
    
    // Handle other MCP methods
    res.status(400).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: { code: -32601, message: `Method not found: ${method}` }
    });
    
  } catch (error) {
    console.error('❌ Error processing tool request:', error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

/**
 * HTTP Bridge: Execute FastMCP tools via HTTP requests
 * This bridges HTTP requests to existing FastMCP tool implementations
 */
async function executeToolViaHTTP(toolName: string, args: any): Promise<string> {
  if (!mcpServer) {
    throw new Error('MCP server not initialized');
  }

  // Get the tool from the server using FastMCP internal API
  const tools = (mcpServer as any)._tools || new Map();
  const tool = tools.get(toolName);
  
  if (!tool) {
    throw new Error(`Tool ${toolName} not found in server`);
  }
  
  // Create a mock request object that mimics FastMCP's request structure
  const mockRequest = {
    requestId: `http-bridge-${Date.now()}`,
    meta: {
      httpBridge: true,
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    // Execute the tool using FastMCP's internal structure
    const result = await tool.execute(args, mockRequest);
    return result;
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    throw error;
  }
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Internal server error"
    }
  });
});

// Start the HTTP server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Tanuki MCP HTTP Server running on http://${HOST}:${PORT}`);
  console.log(`📡 SSE endpoint: http://${HOST}:${PORT}/sse`);
  console.log(`🔧 Tool execution: http://${HOST}:${PORT}/messages`);
  console.log(`❤️ Health check: http://${HOST}:${PORT}/health`);
  console.log('🌟 Server ready for Smithery deployment!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app; 