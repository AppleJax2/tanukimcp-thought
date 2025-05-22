/**
 * Copy File Tool
 * Copies a file from one location to another within the workspace
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import { existsSync } from 'fs';

import { ToolRegistration } from '../types.js';
import { ProjectContextManager } from '../../context/index.js';
import { fileExists, copyFile } from '../../utils/file-utils.js';
import { resolveWorkspacePath } from '../../utils/path-utils.js';

/**
 * Register the copy_file tool
 * @param server The MCP server
 */
export const registerCopyFileTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'copy_file',
    description: 'Copy a file from one location to another within the workspace.',
    parameters: z.object({
      source_path: z.string().describe('Path to the source file to copy (relative to workspace_root)'),
      target_path: z.string().describe('Path to the target location (relative to workspace_root)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if target file exists (default: false)'),
      create_target_dirs: z.boolean().optional().describe('Whether to create target parent directories if they don\'t exist (default: true)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { 
          source_path, 
          target_path, 
          overwrite = false, 
          create_target_dirs = true,
          workspace_root 
        } = args;
        
        // Validate inputs
        if (!source_path) {
          return 'Error: Source path cannot be empty.';
        }
        
        if (!target_path) {
          return 'Error: Target path cannot be empty.';
        }
        
        // Prevent dangerous operations on critical files
        if (isCriticalSystemPath(source_path) || isCriticalSystemPath(target_path)) {
          return 'Error: Operation denied - source or target path appears to be a critical system path.';
        }
        
        // Resolve paths
        const resolvedSourcePath = resolveWorkspacePath(workspace_root, source_path);
        const resolvedTargetPath = resolveWorkspacePath(workspace_root, target_path);
        
        // Check if source file exists
        if (!await fileExists(resolvedSourcePath)) {
          return `Error: Source file "${resolvedSourcePath}" does not exist.`;
        }
        
        // Check if target file exists
        if (!overwrite && await fileExists(resolvedTargetPath)) {
          return `Error: Target file "${resolvedTargetPath}" already exists. Set overwrite=true to overwrite.`;
        }
        
        // Create target directories if needed
        if (create_target_dirs) {
          const targetDir = path.dirname(resolvedTargetPath);
          if (!existsSync(targetDir)) {
            try {
              const ensureDirModule = await import('fs/promises');
              await ensureDirModule.mkdir(targetDir, { recursive: true });
            } catch (error) {
              return `Error: Failed to create target directory "${targetDir}" - ${error instanceof Error ? error.message : String(error)}`;
            }
          }
        } else if (!existsSync(path.dirname(resolvedTargetPath))) {
          return `Error: Target directory for "${resolvedTargetPath}" does not exist. Set create_target_dirs=true to create it.`;
        }
        
        // Copy the file
        const result = await copyFile(resolvedSourcePath, resolvedTargetPath, overwrite);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(target_path, path.extname(target_path)),
          path.dirname(resolvedTargetPath)
        );
        
        // Return success response
        return `Successfully copied file from "${resolvedSourcePath}" to "${resolvedTargetPath}".\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to copy file - ${errorMessage}`;
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