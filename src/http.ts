import { createTanukiServer } from './server.js';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * HTTP entry point for the tanukimcp-thought MCP server
 * This automatically starts the server in HTTP/SSE mode with optimizations for Smithery
 */
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 Starting Tanuki Sequential Thought MCP Server (HTTP mode)...`);

// SMITHERY_COMPATIBILITY: Ensure faster server startup for tool scanning
process.env.ENABLE_QUICK_STARTUP = 'true';

// Create the main server
const server = createTanukiServer();

// Create a simple HTTP server specifically for the tools list endpoint
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolsManifestPath = path.join(__dirname, '..', 'tools-manifest.json');

const httpServer = http.createServer(async (req, res) => {
  if (req.url === '/tools-list') {
    res.setHeader('Content-Type', 'application/json');
    try {
      // Read the tools manifest file
      const toolsManifest = await fs.readFile(toolsManifestPath, 'utf8');
      res.statusCode = 200;
      res.end(toolsManifest);
    } catch (error) {
      console.error('Error reading tools manifest:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to read tools manifest' }));
    }
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Listen on a different port
const toolsListPort = port + 1;
httpServer.listen(toolsListPort, host, () => {
  console.log(`📋 Tools list server running at http://${host === '0.0.0.0' ? 'localhost' : host}:${toolsListPort}/tools-list`);
});

// Start the main MCP server
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