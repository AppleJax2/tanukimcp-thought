/**
 * Task Planner Tool
 * Creates a detailed implementation plan for a specific task
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';

import { ToolRegistration } from './types.js';
import { ProjectContextManager } from '../context/index.js';
import { createImplementationPlan } from '../utils/llm-utils.js';
import { fileExists, readFile, createFile } from '../utils/file-utils.js';
import { resolveWorkspacePath, getSanitizedFilename } from '../utils/path-utils.js';

/**
 * Register the plan_task_implementation tool
 * @param server The MCP server
 */
export const registerTaskPlannerTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'plan_task_implementation',
    description: 'Create a detailed implementation plan for a specific task.',
    parameters: z.object({
      task: z.string().describe('The task to implement (text of the task from the todolist)'),
      todolist_file: z.string().describe('Path to the todolist markdown file for context'),
      output_file: z.string().optional().describe('Optional file path to save the implementation plan (default: <task>_plan.md)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if output file exists (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { task, todolist_file, overwrite = false, workspace_root } = args;
        
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
        
        // Generate a file name for the output if not provided
        const output_file = args.output_file || `${getSanitizedFilename(task, '_plan.md')}`;
        
        // Resolve the output path
        const resolvedOutputPath = resolveWorkspacePath(workspace_root, output_file);
        
        // Check for output file existence
        if (!overwrite && await fileExists(resolvedOutputPath)) {
          return `Error: Output file "${resolvedOutputPath}" already exists. Set overwrite=true to overwrite.`;
        }
        
        // Generate implementation plan using the IDE's LLM
        const implementationPlan = await createImplementationPlan(task, todolistContent);
        
        // Ensure the output directory exists and write the file
        const result = await createFile(resolvedOutputPath, implementationPlan, overwrite);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(todolist_file, path.extname(todolist_file)),
          path.dirname(resolvedOutputPath)
        );
        
        // Return success response
        const response = `Successfully created implementation plan for "${task}" and saved to "${resolvedOutputPath}".\n\n${implementationPlan}\n\nTo execute this plan, use the task_executor tool.\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to create implementation plan - ${errorMessage}`;
      }
    },
  });
}; 