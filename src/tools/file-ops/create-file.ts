/**
 * Create File Tool
 * Creates a new file with specified content
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import { existsSync } from 'fs';

import { ToolRegistration } from '../types.js';
import { ProjectContextManager } from '../../context/index.js';
import { fileExists, createFile } from '../../utils/file-utils.js';
import { resolveWorkspacePath } from '../../utils/path-utils.js';

/**
 * Register the create_file tool
 * @param server The MCP server
 */
export const registerCreateFileTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'create_file',
    description: 'Create a new file with the specified content in the workspace.',
    parameters: z.object({
      path: z.string().describe('Path to the file to create (relative to workspace_root)'),
      content: z.string().describe('Content to write to the file'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if file exists (default: false)'),
      create_parent_dirs: z.boolean().optional().describe('Whether to create parent directories if they don\'t exist (default: true)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { path: filePath, content, overwrite = false, create_parent_dirs = true, workspace_root } = args;
        
        // Validate inputs
        if (!filePath) {
          return 'Error: File path cannot be empty.';
        }
        
        // Prevent dangerous operations on critical files
        if (isCriticalSystemPath(filePath)) {
          return `Error: Operation denied - "${filePath}" appears to be a critical system path.`;
        }
        
        // Resolve the output path
        const resolvedFilePath = resolveWorkspacePath(workspace_root, filePath);
        
        // Check for file existence
        if (!overwrite && await fileExists(resolvedFilePath)) {
          return `Error: File "${resolvedFilePath}" already exists. Set overwrite=true to overwrite.`;
        }
        
        // Create parent directories if needed
        if (create_parent_dirs) {
          const dirPath = path.dirname(resolvedFilePath);
          if (!existsSync(dirPath)) {
            try {
              const ensureDirModule = await import('fs/promises');
              await ensureDirModule.mkdir(dirPath, { recursive: true });
            } catch (error) {
              return `Error: Failed to create parent directories for "${resolvedFilePath}" - ${error instanceof Error ? error.message : String(error)}`;
            }
          }
        } else if (!existsSync(path.dirname(resolvedFilePath))) {
          return `Error: Parent directory for "${resolvedFilePath}" does not exist. Set create_parent_dirs=true to create it.`;
        }
        
        // Create the file
        const result = await createFile(resolvedFilePath, content, overwrite);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(filePath, path.extname(filePath)),
          path.dirname(resolvedFilePath)
        );
        
        // Return success response
        return `Successfully created file at "${resolvedFilePath}".\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to create file - ${errorMessage}`;
      }
    },
  });
};

/**
 * Check if a path is a critical system path that should be protected
 * @param filePath The file path to check
 * @returns True if the path is critical and should be protected
 */
function isCriticalSystemPath(filePath: string): boolean {
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  
  // List of critical path patterns
  const criticalPatterns = [
    /^\/etc\//,                  // Unix system config
    /^\/bin\//,                  // Unix binaries
    /^\/sbin\//,                 // Unix system binaries
    /^\/boot\//,                 // Boot files
    /^\/proc\//,                 // Process information
    /^\/sys\//,                  // System information
    /^\/dev\//,                  // Device files
    /^\/var\/log\//,             // Log files
    /^\/var\/spool\//,           // Spool files
    /^c:\/windows\//,            // Windows system
    /^c:\/program files\//,      // Windows programs
    /^c:\/program files \(x86\)\//, // Windows programs (x86)
    /^c:\/system/,               // Windows system
    /^c:\/users\/.*\/appdata\//i, // User AppData
    /\.git\//,                   // Git metadata
    /\.github\//,                // GitHub metadata
    /node_modules\//,            // Node modules
    /package-lock\.json$/,       // Package lock
    /yarn\.lock$/,               // Yarn lock
    /\.env$/,                    // Environment variables
    /authorized_keys$/,          // SSH keys
    /id_rsa$/,                   // SSH private key
    /\.pem$/,                    // PEM certificate
  ];
  
  // Check if the path matches any critical pattern
  return criticalPatterns.some(pattern => pattern.test(normalizedPath));
} 