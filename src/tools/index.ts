/**
 * Tools Index
 * Export all tool registration functions
 */

import { FastMCP } from 'fastmcp';
import { registerBrainDumpTool } from './brain-dump.js';
import { registerEnhanceTodoTool } from './enhance-todo.js';
import { registerTaskFinderTool } from './task-finder.js';
import { registerTaskPlannerTool } from './task-planner.js';
import { registerTaskExecutorTool } from './task-executor.js';
import { registerTaskCompleterTool } from './task-completer.js';
import { registerFileOperationTools } from './file-ops/index.js';

/**
 * Register all tools with the server
 * @param server The MCP server
 */
export function registerAllTools(server: FastMCP): void {
  // Register the core sequential thinking tools
  registerBrainDumpTool(server);
  registerEnhanceTodoTool(server);
  registerTaskFinderTool(server);
  registerTaskPlannerTool(server);
  registerTaskExecutorTool(server);
  registerTaskCompleterTool(server);
  
  // Register all file operation tools
  registerFileOperationTools(server);
  
  console.log('🛠️ All tools registered successfully');
} 