/**
 * Batch Operations Tool
 * Execute multiple file operations in a batch
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import { existsSync } from 'fs';

import { ToolRegistration } from '../types.js';
import { ProjectContextManager } from '../../context/index.js';
import { 
  fileExists, createFile, editFile, deleteFile, 
  moveFile, copyFile, createDirectory, deleteDirectory 
} from '../../utils/file-utils.js';
import { resolveWorkspacePath } from '../../utils/path-utils.js';

// Define operation types for type safety
type FileOperation = 
  | { type: 'create_file'; path: string; content: string; overwrite?: boolean }
  | { type: 'edit_file'; path: string; changes: Array<{
      type: 'replace' | 'append' | 'prepend' | 'insert_at_line';
      old?: string; 
      new?: string; 
      content?: string;
      line?: number;
    }>; create_backup?: boolean }
  | { type: 'delete_file'; path: string; create_backup?: boolean }
  | { type: 'move_file'; from: string; to: string; overwrite?: boolean; create_backup?: boolean }
  | { type: 'copy_file'; from: string; to: string; overwrite?: boolean }
  | { type: 'create_directory'; path: string; recursive?: boolean }
  | { type: 'delete_directory'; path: string; recursive?: boolean; dry_run?: boolean };

/**
 * Register the batch_operations tool
 * @param server The MCP server
 */
export const registerBatchOperationsTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'batch_operations',
    description: 'Execute multiple file operations in a batch.',
    parameters: z.object({
      operations: z.string().describe('JSON array of operations to execute. Each operation should have a type and operation-specific parameters.'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
      dry_run: z.boolean().optional().describe('Whether to validate operations without executing them (default: false)'),
      continue_on_error: z.boolean().optional().describe('Whether to continue execution if an operation fails (default: false)'),
    }),
    execute: async (args, req) => {
      try {
        const { operations, workspace_root, dry_run = false, continue_on_error = false } = args;
        
        // Parse operations JSON
        let parsedOperations: FileOperation[];
        try {
          parsedOperations = JSON.parse(operations);
          if (!Array.isArray(parsedOperations)) {
            return 'Error: Operations must be a JSON array.';
          }
        } catch (error) {
          return `Error: Failed to parse operations JSON - ${error instanceof Error ? error.message : String(error)}`;
        }
        
        // Validate all operations before executing
        const validationResults = [];
        for (let i = 0; i < parsedOperations.length; i++) {
          const op = parsedOperations[i];
          const validationResult = validateOperation(op, i, workspace_root);
          if (validationResult !== true) {
            validationResults.push(validationResult);
          }
        }
        
        // If any validation errors, return them
        if (validationResults.length > 0) {
          return `Error: Validation failed for one or more operations:\n${validationResults.join('\n')}`;
        }
        
        // If dry run, just return the validated operations
        if (dry_run) {
          const operationDescriptions = parsedOperations.map((op, index) => {
            return `${index + 1}. ${describeOperation(op, workspace_root)}`;
          });
          
          return `Dry run: ${parsedOperations.length} operations validated successfully.\n\nOperations:\n${operationDescriptions.join('\n')}\n\nTo execute these operations, run this tool again with dry_run=false.`;
        }
        
        // Execute operations
        const results = [];
        let lastProjectContext = null;
        
        for (let i = 0; i < parsedOperations.length; i++) {
          const op = parsedOperations[i];
          try {
            const result = await executeOperation(op, workspace_root);
            results.push(`✓ Operation ${i + 1}: ${describeOperation(op, workspace_root)} - Success`);
            
            // Update project context based on the last operation type
            switch (op.type) {
              case 'create_file':
              case 'edit_file':
              case 'delete_file':
                lastProjectContext = {
                  name: path.basename(op.path, path.extname(op.path)),
                  dir: path.dirname(resolveWorkspacePath(workspace_root, op.path))
                };
                break;
              case 'move_file':
              case 'copy_file':
                lastProjectContext = {
                  name: path.basename(op.to, path.extname(op.to)),
                  dir: path.dirname(resolveWorkspacePath(workspace_root, op.to))
                };
                break;
              case 'create_directory':
              case 'delete_directory':
                lastProjectContext = {
                  name: path.basename(op.path),
                  dir: path.dirname(resolveWorkspacePath(workspace_root, op.path))
                };
                break;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const failedResult = `✗ Operation ${i + 1}: ${describeOperation(op, workspace_root)} - Failed: ${errorMessage}`;
            results.push(failedResult);
            
            if (!continue_on_error) {
              results.push('Batch execution halted due to error. Set continue_on_error=true to continue execution after errors.');
              break;
            }
          }
        }
        
        // Update project context based on the last successful operation
        if (lastProjectContext) {
          ProjectContextManager.getInstance().setCurrentProject(
            lastProjectContext.name,
            lastProjectContext.dir
          );
        }
        
        // Return results
        return `Executed ${results.length} of ${parsedOperations.length} operations:\n\n${results.join('\n')}\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to execute batch operations - ${errorMessage}`;
      }
    },
  });
};

/**
 * Validate a single operation
 * @param op The operation to validate
 * @param index The index of the operation in the batch
 * @param workspaceRoot The workspace root directory
 * @returns true if valid, error message otherwise
 */
function validateOperation(op: any, index: number, workspaceRoot: string): boolean | string {
  try {
    if (!op || typeof op !== 'object') {
      return `Operation ${index + 1}: Invalid operation format - must be an object with a 'type' property`;
    }
    
    if (!op.type) {
      return `Operation ${index + 1}: Missing 'type' property`;
    }
    
    switch (op.type) {
      case 'create_file':
        if (!op.path) return `Operation ${index + 1}: Missing 'path' property for create_file operation`;
        if (!op.content && op.content !== '') return `Operation ${index + 1}: Missing 'content' property for create_file operation`;
        if (isCriticalSystemPath(op.path)) return `Operation ${index + 1}: Invalid path - "${op.path}" appears to be a critical system path`;
        break;
        
      case 'edit_file':
        if (!op.path) return `Operation ${index + 1}: Missing 'path' property for edit_file operation`;
        if (!op.changes || !Array.isArray(op.changes) || op.changes.length === 0) 
          return `Operation ${index + 1}: Missing or invalid 'changes' property for edit_file operation`;
        if (isCriticalSystemPath(op.path)) return `Operation ${index + 1}: Invalid path - "${op.path}" appears to be a critical system path`;
        break;
        
      case 'delete_file':
        if (!op.path) return `Operation ${index + 1}: Missing 'path' property for delete_file operation`;
        if (isCriticalSystemPath(op.path)) return `Operation ${index + 1}: Invalid path - "${op.path}" appears to be a critical system path`;
        break;
        
      case 'move_file':
        if (!op.from) return `Operation ${index + 1}: Missing 'from' property for move_file operation`;
        if (!op.to) return `Operation ${index + 1}: Missing 'to' property for move_file operation`;
        if (isCriticalSystemPath(op.from) || isCriticalSystemPath(op.to)) 
          return `Operation ${index + 1}: Invalid path - source or target appears to be a critical system path`;
        break;
        
      case 'copy_file':
        if (!op.from) return `Operation ${index + 1}: Missing 'from' property for copy_file operation`;
        if (!op.to) return `Operation ${index + 1}: Missing 'to' property for copy_file operation`;
        if (isCriticalSystemPath(op.from) || isCriticalSystemPath(op.to)) 
          return `Operation ${index + 1}: Invalid path - source or target appears to be a critical system path`;
        break;
        
      case 'create_directory':
        if (!op.path) return `Operation ${index + 1}: Missing 'path' property for create_directory operation`;
        if (isCriticalSystemPath(op.path)) return `Operation ${index + 1}: Invalid path - "${op.path}" appears to be a critical system path`;
        break;
        
      case 'delete_directory':
        if (!op.path) return `Operation ${index + 1}: Missing 'path' property for delete_directory operation`;
        if (isCriticalSystemPath(op.path)) return `Operation ${index + 1}: Invalid path - "${op.path}" appears to be a critical system path`;
        break;
        
      default:
        return `Operation ${index + 1}: Unknown operation type "${op.type}"`;
    }
    
    return true;
  } catch (error) {
    return `Operation ${index + 1}: Validation error - ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Execute a single operation
 * @param op The operation to execute
 * @param workspaceRoot The workspace root directory
 * @returns The result of the operation
 */
async function executeOperation(op: FileOperation, workspaceRoot: string): Promise<string> {
  switch (op.type) {
    case 'create_file': {
      const resolvedPath = resolveWorkspacePath(workspaceRoot, op.path);
      return await createFile(resolvedPath, op.content, op.overwrite || false);
    }
    
    case 'edit_file': {
      const resolvedPath = resolveWorkspacePath(workspaceRoot, op.path);
      
      // Create backup if requested
      if (op.create_backup) {
        try {
          const fileContent = await fileExists(resolvedPath) ? await import('fs/promises').then(fs => fs.readFile(resolvedPath, 'utf-8')) : '';
          const backupPath = `${resolvedPath}.bak`;
          await import('fs/promises').then(fs => fs.writeFile(backupPath, fileContent, 'utf-8'));
        } catch (error) {
          throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return await editFile(resolvedPath, op.changes);
    }
    
    case 'delete_file': {
      const resolvedPath = resolveWorkspacePath(workspaceRoot, op.path);
      
      // Create backup if requested
      if (op.create_backup) {
        try {
          const fileContent = await fileExists(resolvedPath) ? await import('fs/promises').then(fs => fs.readFile(resolvedPath, 'utf-8')) : '';
          const backupPath = `${resolvedPath}.bak`;
          await import('fs/promises').then(fs => fs.writeFile(backupPath, fileContent, 'utf-8'));
        } catch (error) {
          throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return await deleteFile(resolvedPath);
    }
    
    case 'move_file': {
      const resolvedFrom = resolveWorkspacePath(workspaceRoot, op.from);
      const resolvedTo = resolveWorkspacePath(workspaceRoot, op.to);
      
      // Create backup if requested
      if (op.create_backup) {
        try {
          const fileContent = await fileExists(resolvedFrom) ? await import('fs/promises').then(fs => fs.readFile(resolvedFrom, 'utf-8')) : '';
          const backupPath = `${resolvedFrom}.bak`;
          await import('fs/promises').then(fs => fs.writeFile(backupPath, fileContent, 'utf-8'));
        } catch (error) {
          throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return await moveFile(resolvedFrom, resolvedTo, op.overwrite || false);
    }
    
    case 'copy_file': {
      const resolvedFrom = resolveWorkspacePath(workspaceRoot, op.from);
      const resolvedTo = resolveWorkspacePath(workspaceRoot, op.to);
      return await copyFile(resolvedFrom, resolvedTo, op.overwrite || false);
    }
    
    case 'create_directory': {
      const resolvedPath = resolveWorkspacePath(workspaceRoot, op.path);
      return await createDirectory(resolvedPath, op.recursive !== false);
    }
    
    case 'delete_directory': {
      const resolvedPath = resolveWorkspacePath(workspaceRoot, op.path);
      return await deleteDirectory(resolvedPath, op.recursive || false, op.dry_run || false);
    }
    
    default:
      throw new Error(`Unknown operation type: ${(op as any).type}`);
  }
}

/**
 * Generate a human-readable description of an operation
 * @param op The operation to describe
 * @param workspaceRoot The workspace root directory
 * @returns A human-readable description
 */
function describeOperation(op: FileOperation, workspaceRoot: string): string {
  switch (op.type) {
    case 'create_file':
      return `Create file "${op.path}" (${op.content.length} bytes${op.overwrite ? ', overwrite if exists' : ''})`;
      
    case 'edit_file':
      return `Edit file "${op.path}" (${op.changes.length} changes${op.create_backup ? ', with backup' : ''})`;
      
    case 'delete_file':
      return `Delete file "${op.path}"${op.create_backup ? ' (with backup)' : ''}`;
      
    case 'move_file':
      return `Move file from "${op.from}" to "${op.to}"${op.overwrite ? ' (overwrite if exists)' : ''}${op.create_backup ? ' (with backup)' : ''}`;
      
    case 'copy_file':
      return `Copy file from "${op.from}" to "${op.to}"${op.overwrite ? ' (overwrite if exists)' : ''}`;
      
    case 'create_directory':
      return `Create directory "${op.path}"${op.recursive !== false ? ' (with parents)' : ''}`;
      
    case 'delete_directory':
      return `Delete directory "${op.path}"${op.recursive ? ' (recursive)' : ''}${op.dry_run ? ' (dry run)' : ''}`;
      
    default:
      return `Unknown operation type: ${(op as any).type}`;
  }
}

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