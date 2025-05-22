/**
 * Brain Dump Tool
 * Transforms unstructured thoughts into a structured markdown todolist
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { existsSync } from 'fs';
import path from 'path';

import { ToolRegistration } from './types.js';
import { ProjectContextManager } from '../context/index.js';
import { generateTodolist } from '../utils/llm-utils.js';
import { fileExists, createFile } from '../utils/file-utils.js';
import { resolveWorkspacePath, getSanitizedFilename } from '../utils/path-utils.js';

/**
 * Register the brain_dump_organize tool
 * @param server The MCP server
 */
export const registerBrainDumpTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'brain_dump_organize',
    description: 'Transform unstructured thoughts into a structured markdown todolist. Will not overwrite existing files unless overwrite=true.',
    parameters: z.object({
      project_description: z.string().describe('Brief description of the project'),
      unstructured_thoughts: z.string().describe('Unstructured thoughts, ideas, and considerations about the project'),
      output_file: z.string().optional().describe('Optional file path to save the todolist (default: <project>_todo.md)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if file exists (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { project_description, unstructured_thoughts, overwrite = false, workspace_root } = args;
        
        // Validate inputs
        if (!project_description.trim()) {
          return 'Error: Project description cannot be empty.';
        }
        
        if (!unstructured_thoughts.trim()) {
          return 'Error: Unstructured thoughts cannot be empty.';
        }
        
        // Generate a file name based on the project description if not provided
        const output_file = args.output_file || `${getSanitizedFilename(project_description, '_todo.md')}`;
        
        // Resolve the output path
        const resolvedOutputPath = resolveWorkspacePath(workspace_root, output_file);
        
        // Check for file existence
        if (!overwrite && await fileExists(resolvedOutputPath)) {
          return `Error: File "${resolvedOutputPath}" already exists. Set overwrite=true to overwrite.`;
        }
        
        // Generate todolist using the IDE's LLM
        const todolist = await generateTodolist(project_description, unstructured_thoughts);
        
        // Ensure the output directory exists and write the file
        const result = await createFile(resolvedOutputPath, todolist, overwrite);
        
        // Set current project context after successful file creation
        ProjectContextManager.getInstance().setCurrentProject(
          project_description,
          path.dirname(resolvedOutputPath)
        );
        
        // Add guidance for LLMs on workspace_root
        const response = `Successfully created todolist and saved to "${resolvedOutputPath}".\n\n${todolist}\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to create and save todolist - ${errorMessage}`;
      }
    },
  });
}; 