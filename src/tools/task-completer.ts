/**
 * Task Completer Tool
 * Marks a task as complete in the todolist
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';

import { ToolRegistration } from './types.js';
import { ProjectContextManager } from '../context/index.js';
import { fileExists, readFile, createFile } from '../utils/file-utils.js';
import { resolveWorkspacePath } from '../utils/path-utils.js';

/**
 * Register the mark_task_complete tool
 * @param server The MCP server
 */
export const registerTaskCompleterTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'mark_task_complete',
    description: 'Mark a specific task as complete in the todolist.',
    parameters: z.object({
      task: z.string().describe('The task to mark as complete (text of the task from the todolist)'),
      todolist_file: z.string().describe('Path to the todolist markdown file'),
      create_backup: z.boolean().optional().describe('Whether to create a backup of the original file (default: true)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { task, todolist_file, create_backup = true, workspace_root } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Resolve the todolist file path
        const resolvedTodolistPath = resolveWorkspacePath(workspace_root, todolist_file);
        
        // Check if todolist file exists
        if (!await fileExists(resolvedTodolistPath)) {
          return `Error: Todolist file "${resolvedTodolistPath}" does not exist.`;
        }
        
        // Read the content of the todolist file
        const todolistContent = await readFile(resolvedTodolistPath);
        if (!todolistContent) {
          return `Error: Failed to read content from "${resolvedTodolistPath}".`;
        }
        
        // Create a backup if requested
        if (create_backup) {
          const backupPath = `${resolvedTodolistPath}.bak`;
          await createFile(backupPath, todolistContent, true);
        }
        
        // Replace the task line with a completed version
        const taskEscaped = escapeRegExp(task.trim());
        const uncheckedTaskRegex = new RegExp(`- \\[ \\]\\s*${taskEscaped}`, 'gm');
        const updatedTodolist = todolistContent.replace(uncheckedTaskRegex, `- [x] ${task.trim()}`);
        
        // Check if any replacements were made
        if (updatedTodolist === todolistContent) {
          return `No changes made: Could not find unchecked task "${task}" in the todolist.`;
        }
        
        // Write the updated todolist back to the file
        await createFile(resolvedTodolistPath, updatedTodolist, true);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(todolist_file, path.extname(todolist_file)),
          path.dirname(resolvedTodolistPath)
        );
        
        // Return success response
        return `Successfully marked task "${task}" as complete in "${resolvedTodolistPath}".\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to mark task as complete - ${errorMessage}`;
      }
    },
  });
};

/**
 * Escape special characters in a string for use in a regular expression
 * @param string The string to escape
 * @returns Escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 