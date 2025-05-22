/**
 * File Operations Tools Index
 * Export all file operation tool registration functions
 */

import { FastMCP } from 'fastmcp';
import { registerCreateFileTool } from './create-file.js';
import { registerEditFileTool } from './edit-file.js';
import { registerDeleteFileTool } from './delete-file.js';
import { registerMoveFileTool } from './move-file.js';
import { registerCopyFileTool } from './copy-file.js';
import { 
  registerCreateDirectoryTool, 
  registerListDirectoryTool, 
  registerDeleteDirectoryTool 
} from './directory-ops.js';
import { registerBatchOperationsTool } from './batch-ops.js';

/**
 * Register all file operation tools with the server
 * @param server The MCP server
 */
export function registerFileOperationTools(server: FastMCP): void {
  // Register basic file operations
  registerCreateFileTool(server);
  registerEditFileTool(server);
  registerDeleteFileTool(server);
  registerMoveFileTool(server);
  registerCopyFileTool(server);
  
  // Register directory operations
  registerCreateDirectoryTool(server);
  registerListDirectoryTool(server);
  registerDeleteDirectoryTool(server);
  
  // Register batch operations
  registerBatchOperationsTool(server);
  
  console.log('✅ Registered all file operation tools');
} 