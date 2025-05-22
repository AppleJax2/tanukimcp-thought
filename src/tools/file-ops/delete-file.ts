/**
 * Delete File Tool
 * Deletes a file from the workspace
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import { existsSync } from 'fs';

import { ToolRegistration } from '../types.js';
import { ProjectContextManager } from '../../context/index.js';
import { fileExists, readFile, deleteFile } from '../../utils/file-utils.js';
import { resolveWorkspacePath } from '../../utils/path-utils.js';

/**
 * Register the delete_file tool
 * @param server The MCP server
 */
export const registerDeleteFileTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'delete_file',
    description: 'Delete a file from the workspace.',
    parameters: z.object({
      path: z.string().describe('Path to the file to delete (relative to workspace_root)'),
      create_backup: z.boolean().optional().describe('Whether to create a backup of the file before deletion (default: true)'),
      confirm_deletion: z.boolean().optional().describe('Confirm that the file should be deleted (default: true, always required)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { path: filePath, create_backup = true, confirm_deletion = true, workspace_root } = args;
        
        // Validate inputs
        if (!filePath) {
          return 'Error: File path cannot be empty.';
        }
        
        // Check for confirmed deletion
        if (!confirm_deletion) {
          return 'Error: Deletion must be confirmed by setting confirm_deletion=true.';
        }
        
        // Prevent dangerous operations on critical files
        if (isCriticalSystemPath(filePath)) {
          return `Error: Operation denied - "${filePath}" appears to be a critical system path.`;
        }
        
        // Resolve the file path
        const resolvedFilePath = resolveWorkspacePath(workspace_root, filePath);
        
        // Check if file exists
        if (!await fileExists(resolvedFilePath)) {
          return `Error: File "${resolvedFilePath}" does not exist.`;
        }
        
        // Create backup if requested
        if (create_backup) {
          try {
            const fileContent = await readFile(resolvedFilePath);
            const backupPath = `${resolvedFilePath}.bak`;
            const fs = await import('fs/promises');
            await fs.writeFile(backupPath, fileContent, 'utf-8');
          } catch (error) {
            return `Error: Failed to create backup of "${resolvedFilePath}" - ${error instanceof Error ? error.message : String(error)}`;
          }
        }
        
        // Delete the file
        const result = await deleteFile(resolvedFilePath);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(filePath, path.extname(filePath)),
          path.dirname(resolvedFilePath)
        );
        
        // Return success response
        let responseMessage = `Successfully deleted file "${resolvedFilePath}".`;
        if (create_backup) {
          responseMessage += ` A backup was created at "${resolvedFilePath}.bak".`;
        }
        
        return `${responseMessage}\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to delete file - ${errorMessage}`;
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