/**
 * Edit File Tool
 * Edits an existing file by applying changes (replace, append, prepend, insert_at_line)
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';

import { ToolRegistration } from '../types.js';
import { ProjectContextManager } from '../../context/index.js';
import { fileExists, readFile, editFile } from '../../utils/file-utils.js';
import { resolveWorkspacePath } from '../../utils/path-utils.js';

// Define type for file changes to ensure type safety
type FileChange = {
  type: 'replace' | 'append' | 'prepend' | 'insert_at_line';
  old?: string;
  new?: string;
  content?: string;
  line?: number;
};

/**
 * Register the edit_file tool
 * @param server The MCP server
 */
export const registerEditFileTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'edit_file',
    description: 'Edit an existing file by applying changes (replace, append, prepend, insert_at_line).',
    parameters: z.object({
      path: z.string().describe('Path to the file to edit (relative to workspace_root)'),
      change_type: z.enum(['replace', 'append', 'prepend', 'insert_at_line']).describe('Type of change to apply'),
      old_content: z.string().optional().describe('Content to replace (required for "replace" change type)'),
      new_content: z.string().optional().describe('New content to insert (required for "replace" change type)'),
      content: z.string().optional().describe('Content to append/prepend/insert (required for "append", "prepend", "insert_at_line" change types)'),
      line: z.number().optional().describe('Line number for insertion (required for "insert_at_line" change type, 0-based index)'),
      create_backup: z.boolean().optional().describe('Whether to create a backup of the original file (default: true)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { 
          path: filePath, 
          change_type, 
          old_content, 
          new_content, 
          content, 
          line, 
          create_backup = true, 
          workspace_root 
        } = args;
        
        // Validate inputs
        if (!filePath) {
          return 'Error: File path cannot be empty.';
        }
        
        // Validate change type specific parameters
        if (change_type === 'replace' && (!old_content || !new_content)) {
          return 'Error: "replace" change type requires both old_content and new_content parameters.';
        }
        
        if ((change_type === 'append' || change_type === 'prepend') && !content) {
          return `Error: "${change_type}" change type requires the content parameter.`;
        }
        
        if (change_type === 'insert_at_line') {
          if (!content) {
            return 'Error: "insert_at_line" change type requires the content parameter.';
          }
          if (line === undefined || line < 0) {
            return 'Error: "insert_at_line" change type requires a valid line parameter (0-based index).';
          }
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
        
        // Prepare changes array
        const changes: FileChange[] = [];
        
        if (change_type === 'replace') {
          changes.push({
            type: 'replace',
            old: old_content,
            new: new_content
          });
        } else if (change_type === 'append') {
          changes.push({
            type: 'append',
            content: content
          });
        } else if (change_type === 'prepend') {
          changes.push({
            type: 'prepend',
            content: content
          });
        } else if (change_type === 'insert_at_line') {
          changes.push({
            type: 'insert_at_line',
            line: line,
            content: content
          });
        }
        
        // Apply the changes
        const result = await editFile(resolvedFilePath, changes);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(filePath, path.extname(filePath)),
          path.dirname(resolvedFilePath)
        );
        
        // Return success response
        let responseMessage = `Successfully edited file "${resolvedFilePath}" with ${change_type} operation.`;
        if (create_backup) {
          responseMessage += ` A backup was created at "${resolvedFilePath}.bak".`;
        }
        
        return `${responseMessage}\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to edit file - ${errorMessage}`;
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