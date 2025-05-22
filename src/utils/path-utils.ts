/**
 * Path Utilities
 * This module provides utilities for path resolution and manipulation
 */

import path from 'path';
import os from 'os';

/**
 * ProjectPath interface to encapsulate path resolution context
 */
export interface ProjectPath {
  name: string;
  rootPath: string;
}

/**
 * Ensure a path is relative by removing any leading slashes or drive letters
 * @param filePath The file path to ensure is relative
 * @returns A relative path
 */
export function ensureRelativePath(filePath: string): string {
  // Return empty string for empty paths
  if (!filePath) return '';
  
  // If the path is already relative, return it directly
  if (!path.isAbsolute(filePath)) {
    // Remove any ./ prefix for cleaner paths
    return filePath.replace(/^\.\//, '');
  }
  
  // For Windows paths with drive letters (C:\path\to\file)
  if (/^[A-Za-z]:\\/.test(filePath)) {
    // Remove drive letter and convert backslashes to forward slashes
    return filePath.replace(/^[A-Za-z]:\\/, '').replace(/\\/g, '/');
  }
  
  // For Unix-style absolute paths (/path/to/file)
  if (filePath.startsWith('/')) {
    return filePath.substring(1);
  }
  
  // Fall back to path.basename if we can't extract a proper relative path
  return path.basename(filePath);
}

/**
 * Normalize a Windows path that might have been URL-encoded
 * @param windowsPath Potentially URL-encoded Windows path
 * @returns Normalized Windows path
 */
export function normalizeWindowsPath(windowsPath: string): string {
  if (!windowsPath) return windowsPath;
  
  // Handle potential Windows path with drive letter that got URL-encoded
  if (windowsPath.includes('%3A')) {
    console.log(`*** Detected potentially URL-encoded Windows path: ${windowsPath} ***`);
    
    try {
      // Check if it's a /c%3A/Users/... style path
      if (windowsPath.startsWith('/') && /^\/[a-zA-Z]%3A\//.test(windowsPath)) {
        // Remove the leading slash and decode
        const decodedPath = decodeURIComponent(windowsPath);
        // Convert /c:/Users/... to C:\Users\...
        if (/^\/[a-zA-Z]:\//.test(decodedPath)) {
          const driveLetter = decodedPath.charAt(1).toUpperCase();
          const restOfPath = decodedPath.substring(3).replace(/\//g, '\\');
          const normalizedPath = `${driveLetter}:\\${restOfPath}`;
          console.log(`*** Normalized Windows path: ${normalizedPath} ***`);
          return normalizedPath;
        }
      }
      
      // Decode the path but maintain its structure
      return decodeURIComponent(windowsPath);
    } catch (error) {
      console.error('Error decoding URL-encoded path:', error);
      return windowsPath; // Return original if decoding fails
    }
  }
  
  // Detect paths that incorrectly prepend C:\ to an already absolute path 
  if (windowsPath.includes('C:\\c%3A\\') || windowsPath.includes('C:\\C%3A\\')) {
    console.log(`*** Detected double-encoded path: ${windowsPath} ***`);
    // Extract the part after C:\c%3A\ and treat that as the base path
    const parts = windowsPath.split('\\c%3A\\');
    if (parts.length > 1) {
      const fixedPath = `C:\\${parts[1]}`;
      console.log(`*** Corrected to: ${fixedPath} ***`);
      return fixedPath;
    }
  }
  
  return windowsPath;
}

/**
 * Resolve a path relative to a workspace root
 * @param workspaceRoot Absolute path to the workspace root
 * @param targetPath Target path to resolve
 * @param projectContext Optional project context
 * @returns Resolved absolute path
 */
export function resolveWorkspacePath(workspaceRoot: string, targetPath: string, projectContext?: string | ProjectPath): string {
  // Require an explicit workspace root
  if (!workspaceRoot || workspaceRoot === '.') {
    throw new Error('workspace_root parameter is required and must be an absolute path');
  }
  
  // Normalize Windows paths
  workspaceRoot = normalizeWindowsPath(workspaceRoot);
  
  // If the target path is already absolute, use it directly
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  
  // If workspace root is not absolute after normalization, this is an error
  if (!path.isAbsolute(workspaceRoot)) {
    throw new Error(`workspace_root must be an absolute path, got: ${workspaceRoot}`);
  }
  
  // Resolve the path relative to the workspace root
  const resolved = path.resolve(workspaceRoot, targetPath);
  
  return resolved;
}

/**
 * Resolve a project path
 * @param projectName Name of the project
 * @returns Path to the project directory
 */
export function resolveProjectPath(projectName: string): string {
  // Sanitize project name for directory creation
  const sanitizedName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  // Create projects directory in user's home directory
  return path.join(os.homedir(), 'projects', sanitizedName);
}

/**
 * Get a sanitized filename from a project description
 * @param projectDescription Project description
 * @param extension Optional file extension (with dot)
 * @returns Sanitized filename
 */
export function getSanitizedFilename(projectDescription: string, extension = '.md'): string {
  // Sanitize the project name to create a valid filename
  const sanitizedName = projectDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30); // Limit length
  
  return `${sanitizedName}${extension}`;
} 