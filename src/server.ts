/**
 * Tanuki MCP Server
 * Core server setup for the Tanuki Sequential Thought MCP
 */

import { FastMCP } from 'fastmcp';
import { OPTIMIZE_FOR_TOOL_SCAN } from './utils/llm-utils.js';
import { registerAllTools } from './tools/index.js';
import fs from 'fs';
import path from 'path';

/**
 * Creates the Tanuki Sequential Thought MCP server
 * @returns The configured FastMCP server instance
 */
export function createTanukiServer(): FastMCP {
  // Check if this is a Smithery tool scan
  const isToolScan = process.env.SMITHERY_TOOL_SCAN === 'true';
  
  // Create the server with required options
  const server = new FastMCP({
    name: 'tanukimcp-thought',
    version: '1.0.0',
  });

  // Log optimization mode if enabled
  if (OPTIMIZE_FOR_TOOL_SCAN) {
    console.log('⚡ Server running in optimization mode for tool scanning');
  }

  // Only register tools if not in tool scan mode to speed up initialization
  if (!isToolScan) {
  // Register all tools
  registerAllTools(server);
  } else {
    // For tool scanning, we'll manually handle tool list responses
    // by directly using the manifest in index.ts
    console.log('🔍 Tool scan mode: Using optimized tool registration');
  }

  return server;
}