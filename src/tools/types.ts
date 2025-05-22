/**
 * Tool Types
 * Type definitions for MCP tools
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';

/**
 * Tool registration function
 * A function that registers a tool with the MCP server
 */
export type ToolRegistration = (server: FastMCP) => void;

/**
 * Tool definition
 * Structure for defining a tool
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (args: any, req?: any) => Promise<string>;
}

/**
 * File operation types
 */
export enum FileOperationType {
  CREATE_FILE = 'create_file',
  EDIT_FILE = 'edit_file',
  DELETE_FILE = 'delete_file',
  MOVE_FILE = 'move_file',
  COPY_FILE = 'copy_file',
  CREATE_DIRECTORY = 'create_directory',
  DELETE_DIRECTORY = 'delete_directory'
}

/**
 * File change type for edit operations
 */
export enum FileChangeType {
  REPLACE = 'replace',
  APPEND = 'append',
  PREPEND = 'prepend',
  INSERT_AT_LINE = 'insert_at_line'
}

/**
 * Create file operation
 */
export interface CreateFileOperation {
  type: FileOperationType.CREATE_FILE;
  path: string;
  content: string;
  description?: string;
}

/**
 * File change for edit operations
 */
export interface FileChange {
  type: FileChangeType;
  old?: string;
  new?: string;
  content?: string;
  line?: number;
}

/**
 * Edit file operation
 */
export interface EditFileOperation {
  type: FileOperationType.EDIT_FILE;
  path: string;
  changes: FileChange[];
  description?: string;
}

/**
 * Delete file operation
 */
export interface DeleteFileOperation {
  type: FileOperationType.DELETE_FILE;
  path: string;
  description?: string;
}

/**
 * Move file operation
 */
export interface MoveFileOperation {
  type: FileOperationType.MOVE_FILE;
  from: string;
  to: string;
  description?: string;
}

/**
 * Copy file operation
 */
export interface CopyFileOperation {
  type: FileOperationType.COPY_FILE;
  from: string;
  to: string;
  description?: string;
}

/**
 * Create directory operation
 */
export interface CreateDirectoryOperation {
  type: FileOperationType.CREATE_DIRECTORY;
  path: string;
  description?: string;
}

/**
 * Delete directory operation
 */
export interface DeleteDirectoryOperation {
  type: FileOperationType.DELETE_DIRECTORY;
  path: string;
  recursive?: boolean;
  description?: string;
}

/**
 * File operation union type
 */
export type FileOperation = 
  | CreateFileOperation
  | EditFileOperation
  | DeleteFileOperation
  | MoveFileOperation
  | CopyFileOperation
  | CreateDirectoryOperation
  | DeleteDirectoryOperation; 