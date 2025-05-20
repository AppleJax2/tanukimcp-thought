import { createTanukiServer } from './server';

const server = createTanukiServer();

// Start the server using HTTP transport
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

server.listen({
  transport: 'sse',
  port,
  host,
  onReady: () => {
    console.log(`🚀 Tanuki Sequential Thought MCP Server running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/sse`);
  }
}); 