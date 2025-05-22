/**
 * File Utilities
 * This module provides utilities for file operations
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Check if a file exists and is accessible
 * @param filePath Path to the file
 * @returns True if the file exists and is accessible
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file and return its contents
 * @param filePath Path to the file
 * @returns The file content as a string
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read file: ${errorMessage}`);
  }
}

/**
 * Create a file with the given content
 * @param filePath Path to the file
 * @param content Content to write
 * @param overwrite Whether to overwrite if file exists
 * @returns Result message
 */
export async function createFile(filePath: string, content: string, overwrite = false): Promise<string> {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Check if file exists
    if (!overwrite && await fileExists(filePath)) {
      return `Error: File already exists at ${filePath}. Set overwrite=true to overwrite.`;
    }
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    return `File created at ${filePath}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create file: ${errorMessage}`);
  }
}

/**
 * Edit a file with the given changes
 * @param filePath Path to the file
 * @param changes Array of changes to apply
 * @returns Result message
 */
export async function editFile(
  filePath: string, 
  changes: Array<{
    type: 'replace' | 'append' | 'prepend' | 'insert_at_line',
    old?: string,
    new?: string,
    content?: string,
    line?: number
  }>
): Promise<string> {
  try {
    // Check if file exists
    if (!await fileExists(filePath)) {
      return `Error: File not found: ${filePath}`;
    }
    
    // Read file
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Apply changes
    for (const change of changes) {
      if (change.type === 'replace' && change.old && change.new) {
        content = content.replace(change.old, change.new);
      } else if (change.type === 'append' && change.content) {
        content += change.content;
      } else if (change.type === 'prepend' && change.content) {
        content = change.content + content;
      } else if (change.type === 'insert_at_line' && change.line !== undefined && change.content) {
        const lines = content.split('\n');
        if (change.line >= 0 && change.line <= lines.length) {
          lines.splice(change.line, 0, change.content);
          content = lines.join('\n');
        }
      }
    }
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    return `File edited at ${filePath}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to edit file: ${errorMessage}`);
  }
}

/**
 * Delete a file
 * @param filePath Path to the file
 * @returns Result message
 */
export async function deleteFile(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!await fileExists(filePath)) {
      return `File not found: ${filePath}`;
    }
    
    // Delete file
    await fs.unlink(filePath);
    return `File deleted: ${filePath}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete file: ${errorMessage}`);
  }
}

/**
 * Move a file from one location to another
 * @param fromPath Source path
 * @param toPath Destination path
 * @param overwrite Whether to overwrite if destination exists
 * @returns Result message
 */
export async function moveFile(fromPath: string, toPath: string, overwrite = false): Promise<string> {
  try {
    // Check if source file exists
    if (!await fileExists(fromPath)) {
      return `Source file not found: ${fromPath}`;
    }
    
    // Check if destination file exists
    if (!overwrite && await fileExists(toPath)) {
      return `Destination file already exists: ${toPath}. Set overwrite=true to overwrite.`;
    }
    
    // Create destination directory if it doesn't exist
    const toDir = path.dirname(toPath);
    if (!existsSync(toDir)) {
      await fs.mkdir(toDir, { recursive: true });
    }
    
    // Move file
    await fs.rename(fromPath, toPath);
    return `File moved from ${fromPath} to ${toPath}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to move file: ${errorMessage}`);
  }
}

/**
 * Copy a file from one location to another
 * @param fromPath Source path
 * @param toPath Destination path
 * @param overwrite Whether to overwrite if destination exists
 * @returns Result message
 */
export async function copyFile(fromPath: string, toPath: string, overwrite = false): Promise<string> {
  try {
    // Check if source file exists
    if (!await fileExists(fromPath)) {
      return `Source file not found: ${fromPath}`;
    }
    
    // Check if destination file exists
    if (!overwrite && await fileExists(toPath)) {
      return `Destination file already exists: ${toPath}. Set overwrite=true to overwrite.`;
    }
    
    // Create destination directory if it doesn't exist
    const toDir = path.dirname(toPath);
    if (!existsSync(toDir)) {
      await fs.mkdir(toDir, { recursive: true });
    }
    
    // Copy file
    await fs.copyFile(fromPath, toPath);
    return `File copied from ${fromPath} to ${toPath}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to copy file: ${errorMessage}`);
  }
}

/**
 * Create a directory
 * @param dirPath Path to the directory
 * @param recursive Whether to create parent directories
 * @returns Result message
 */
export async function createDirectory(dirPath: string, recursive = true): Promise<string> {
  try {
    // Check if directory already exists
    if (existsSync(dirPath)) {
      return `Directory already exists at ${dirPath}`;
    }
    
    // Create directory
    await fs.mkdir(dirPath, { recursive });
    return `Directory created at ${dirPath}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create directory: ${errorMessage}`);
  }
}

/**
 * List directory contents
 * @param dirPath Path to the directory
 * @param includeHidden Whether to include hidden files
 * @returns Result message with directory contents
 */
export async function listDirectory(dirPath: string, includeHidden = false): Promise<string> {
  try {
    // Check if directory exists
    if (!existsSync(dirPath)) {
      return `Directory not found: ${dirPath}`;
    }
    
    // Read directory
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];
    const directories = [];
    
    // Process entries
    for (const entry of entries) {
      // Skip hidden files/directories unless include_hidden is true
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        directories.push(`[dir] ${entry.name}/`);
      } else {
        // Get file size if it's a file
        const stats = await fs.stat(path.join(dirPath, entry.name));
        const size = stats.size;
        const sizeStr = size < 1024 ? `${size}B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)}KB` : `${(size / (1024 * 1024)).toFixed(1)}MB`;
        files.push(`[file] ${entry.name} (${sizeStr})`);
      }
    }
    
    // Sort and combine
    directories.sort();
    files.sort();
    const listing = [...directories, ...files].join('\n');
    
    return `Contents of ${dirPath}:\n\n${listing || 'Empty directory'}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list directory: ${errorMessage}`);
  }
}

/**
 * Delete a directory
 * @param dirPath Path to the directory
 * @param recursive Whether to recursively delete contents
 * @param dryRun Whether to preview without making changes
 * @returns Result message
 */
export async function deleteDirectory(dirPath: string, recursive = false, dryRun = false): Promise<string> {
  try {
    // Check if directory exists
    if (!existsSync(dirPath)) {
      return `Directory not found: ${dirPath}`;
    }
    
    // Get contents for preview or to check if directory is empty
    const entries = await fs.readdir(dirPath);
    
    // Preview mode
    if (dryRun) {
      if (entries.length > 0 && !recursive) {
        return `DRY RUN: Would fail to delete non-empty directory ${dirPath}. Use recursive=true to delete with contents.`;
      }
      return `DRY RUN: Would delete directory ${dirPath}${recursive ? ' and all its contents' : ''}`;
    }
    
    // Non-recursive delete requires directory to be empty
    if (entries.length > 0 && !recursive) {
      return `Error: Directory is not empty: ${dirPath}. Use recursive=true to delete non-empty directories.`;
    }
    
    // Perform delete
    if (recursive) {
      await fs.rm(dirPath, { recursive: true, force: true });
    } else {
      await fs.rmdir(dirPath);
    }
    
    return `Directory deleted: ${dirPath}${recursive ? ' (including all contents)' : ''}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete directory: ${errorMessage}`);
  }
} 