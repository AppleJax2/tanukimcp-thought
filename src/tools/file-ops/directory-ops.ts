/**
 * Directory Operations Tools
 * Tools for directory operations (create, list, delete)
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import { existsSync } from 'fs';

import { ToolRegistration } from '../types.js';
import { ProjectContextManager } from '../../context/index.js';
import { createDirectory, listDirectory, deleteDirectory } from '../../utils/file-utils.js';
import { resolveWorkspacePath } from '../../utils/path-utils.js';

/**
 * Register the create_directory tool
 * @param server The MCP server
 */
export const registerCreateDirectoryTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'create_directory',
    description: 'Create a new directory in the workspace.',
    parameters: z.object({
      path: z.string().describe('Path to the directory to create (relative to workspace_root)'),
      recursive: z.boolean().optional().describe('Whether to create parent directories if they don\'t exist (default: true)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { path: dirPath, recursive = true, workspace_root } = args;
        
        // Validate inputs
        if (!dirPath) {
          return 'Error: Directory path cannot be empty.';
        }
        
        // Prevent dangerous operations on critical paths
        if (isCriticalSystemPath(dirPath)) {
          return `Error: Operation denied - "${dirPath}" appears to be a critical system path.`;
        }
        
        // Resolve the directory path
        const resolvedDirPath = resolveWorkspacePath(workspace_root, dirPath);
        
        // Check if directory already exists
        if (existsSync(resolvedDirPath)) {
          return `Directory "${resolvedDirPath}" already exists.`;
        }
        
        // Create the directory
        const result = await createDirectory(resolvedDirPath, recursive);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(dirPath),
          path.dirname(resolvedDirPath)
        );
        
        // Return success response
        return `Successfully created directory at "${resolvedDirPath}".\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to create directory - ${errorMessage}`;
      }
    },
  });
};

/**
 * Register the list_directory tool
 * @param server The MCP server
 */
export const registerListDirectoryTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'list_directory',
    description: 'List the contents of a directory in the workspace.',
    parameters: z.object({
      path: z.string().describe('Path to the directory to list (relative to workspace_root)'),
      include_hidden: z.boolean().optional().describe('Whether to include hidden files (starting with .) (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { path: dirPath, include_hidden = false, workspace_root } = args;
        
        // Validate inputs
        if (!dirPath) {
          return 'Error: Directory path cannot be empty.';
        }
        
        // Prevent dangerous operations on critical paths
        if (isCriticalSystemPath(dirPath)) {
          return `Error: Operation denied - "${dirPath}" appears to be a critical system path.`;
        }
        
        // Resolve the directory path
        const resolvedDirPath = resolveWorkspacePath(workspace_root, dirPath);
        
        // Check if directory exists
        if (!existsSync(resolvedDirPath)) {
          return `Error: Directory "${resolvedDirPath}" does not exist.`;
        }
        
        // List the directory contents
        const result = await listDirectory(resolvedDirPath, include_hidden);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(dirPath),
          resolvedDirPath
        );
        
        // Return directory listing
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to list directory - ${errorMessage}`;
      }
    },
  });
};

/**
 * Register the delete_directory tool
 * @param server The MCP server
 */
export const registerDeleteDirectoryTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'delete_directory',
    description: 'Delete a directory from the workspace.',
    parameters: z.object({
      path: z.string().describe('Path to the directory to delete (relative to workspace_root)'),
      recursive: z.boolean().optional().describe('Whether to recursively delete contents (required for non-empty directories) (default: false)'),
      dry_run: z.boolean().optional().describe('Whether to preview deletion without actually deleting (default: false)'),
      confirm_deletion: z.boolean().optional().describe('Confirm that the directory should be deleted (default: true, always required)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { 
          path: dirPath, 
          recursive = false, 
          dry_run = false, 
          confirm_deletion = true, 
          workspace_root 
        } = args;
        
        // Validate inputs
        if (!dirPath) {
          return 'Error: Directory path cannot be empty.';
        }
        
        // Check for confirmed deletion
        if (!confirm_deletion) {
          return 'Error: Deletion must be confirmed by setting confirm_deletion=true.';
        }
        
        // Prevent dangerous operations on critical paths
        if (isCriticalSystemPath(dirPath)) {
          return `Error: Operation denied - "${dirPath}" appears to be a critical system path.`;
        }
        
        // Resolve the directory path
        const resolvedDirPath = resolveWorkspacePath(workspace_root, dirPath);
        
        // Check if directory exists
        if (!existsSync(resolvedDirPath)) {
          return `Error: Directory "${resolvedDirPath}" does not exist.`;
        }
        
        // Delete the directory
        const result = await deleteDirectory(resolvedDirPath, recursive, dry_run);
        
        // Update project context if not in dry_run mode
        if (!dry_run) {
          ProjectContextManager.getInstance().setCurrentProject(
            path.basename(dirPath),
            path.dirname(resolvedDirPath)
          );
        }
        
        // Return result
        return `${result}\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to delete directory - ${errorMessage}`;
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