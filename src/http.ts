import { createTanukiServer } from './server.js';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

/**
 * HTTP entry point for the tanukimcp-thought MCP server
 * This automatically starts the server in HTTP/SSE mode with optimizations for Smithery
 */
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';
const toolsPort = process.env.TOOLS_PORT ? parseInt(process.env.TOOLS_PORT) : port + 1;

console.log(`🚀 Starting Tanuki Sequential Thought MCP Server (HTTP mode)...`);

// SMITHERY_COMPATIBILITY: Ensure faster server startup for tool scanning
process.env.ENABLE_QUICK_STARTUP = 'true';

// Get directory name for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the static tools response file
const toolsResponsePath = path.join(__dirname, '..', 'tools-response.json');

// Preload the tools response file to avoid any file I/O during request handling
let cachedToolsResponse = '';
try {
  if (existsSync(toolsResponsePath)) {
    cachedToolsResponse = readFileSync(toolsResponsePath, 'utf8');
    console.log('✅ Preloaded tools response file');
  } else {
    console.warn('⚠️ Tools response file not found, will try to read dynamically');
  }
} catch (error) {
  console.error('Error preloading tools response file:', error);
}

// Create a dedicated HTTP server for tools list
const toolsServer = http.createServer(async (req, res) => {
  // Set CORS headers to allow Smithery to access from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Serve the tools list for any path - make it as responsive as possible
  res.setHeader('Content-Type', 'application/json');
  
  // Use the cached response if available to avoid any I/O
  if (cachedToolsResponse) {
    res.statusCode = 200;
    res.end(cachedToolsResponse);
    return;
  }

  // Fallback to reading the file if not cached
  try {
    const toolsResponse = await fs.readFile(toolsResponsePath, 'utf8');
    res.statusCode = 200;
    res.end(toolsResponse);
  } catch (error) {
    console.error('Error reading tools response file:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      jsonrpc: "2.0", 
      error: { 
        code: -32603, 
        message: "Internal error reading tools list" 
      },
      id: "tools-list"
    }));
  }
});

// Start the tools server
toolsServer.listen(toolsPort, host, () => {
  console.log(`📋 Tools list server running at http://${host === '0.0.0.0' ? 'localhost' : host}:${toolsPort}`);
});

// Create and start the main server
const server = createTanukiServer();
server.start({
  transportType: 'sse',
  sse: {
    port,
    endpoint: '/sse'
  }
});

// Log server information
console.log(`📋 Tanuki Sequential Thought MCP Server is running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/sse`);
console.log('Available tools:');
console.log('- brain_dump_organize: Transform unstructured thoughts into a structured todolist');
console.log('- enhance_todolist: Add detailed specifications to a todolist');
console.log('- find_next_task: Identify the next logical task to implement');
console.log('- plan_task_implementation: Create a detailed implementation plan for a task');
console.log('- task_executor: Execute a planned task by implementing necessary file operations');
console.log('- mark_task_complete: Mark a task as complete in the todolist');
console.log('- create_file: Create a new file with specified content');
console.log('- edit_file: Edit an existing file by applying changes');
console.log('- delete_file: Delete a file from the workspace');
console.log('- move_file: Move a file from one location to another');
console.log('- copy_file: Copy a file from one location to another');
console.log('- create_directory: Create a new directory');
console.log('- list_directory: List contents of a directory');
console.log('- delete_directory: Delete a directory');
console.log('- batch_operations: Execute multiple file operations in a batch'); 