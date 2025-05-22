/**
 * Tanuki MCP Server
 * Core server setup for the Tanuki Sequential Thought MCP
 */

import { FastMCP } from 'fastmcp';
import { OPTIMIZE_FOR_TOOL_SCAN } from './utils/llm-utils.js';
import { registerAllTools } from './tools/index.js';

/**
 * Creates the Tanuki Sequential Thought MCP server
 * @returns The configured FastMCP server instance
 */
export function createTanukiServer(): FastMCP {
  // Create the server with required options
  const server = new FastMCP({
    name: 'tanukimcp-thought',
    version: '1.0.0',
  });

  // Log optimization mode if enabled
  if (OPTIMIZE_FOR_TOOL_SCAN) {
    console.log('⚡ Server running in optimization mode for tool scanning');
  }

  // Register all tools
  registerAllTools(server);

  return server;
}