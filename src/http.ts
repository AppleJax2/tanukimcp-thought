import { createTanukiServer } from './server.js';

/**
 * HTTP entry point for the tanukimcp-thought MCP server
 * This automatically starts the server in HTTP/SSE mode
 */
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 Starting Tanuki Sequential Thought MCP Server (HTTP mode)...`);

// Create and start the server
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
console.log('- mark_task_complete: Mark a task as complete in the todolist');
console.log('- sequential_thinking: Apply sequential thinking to break down a complex problem'); 