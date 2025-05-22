/**
 * Task Finder Tool
 * Identifies the next logical task to implement from a todolist
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';

import { ToolRegistration } from './types.js';
import { ProjectContextManager } from '../context/index.js';
import { findNextTask } from '../utils/llm-utils.js';
import { fileExists, readFile } from '../utils/file-utils.js';
import { resolveWorkspacePath } from '../utils/path-utils.js';

/**
 * Register the find_next_task tool
 * @param server The MCP server
 */
export const registerTaskFinderTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'find_next_task',
    description: 'Identify the next logical unchecked task to implement from the todolist.',
    parameters: z.object({
      todolist_file: z.string().describe('Path to the todolist markdown file'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { todolist_file, workspace_root } = args;
        
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
        
        // Find the next task using the IDE's LLM
        const nextTask = await findNextTask(todolistContent);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(resolvedTodolistPath, path.extname(resolvedTodolistPath)),
          path.dirname(resolvedTodolistPath)
        );
        
        // Return the next task
        return `Next task to implement: "${nextTask}"\n\nTo create a detailed implementation plan for this task, use the plan_task_implementation tool.\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to find next task - ${errorMessage}`;
      }
    },
  });
}; 