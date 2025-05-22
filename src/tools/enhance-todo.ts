/**
 * Enhance Todo Tool
 * Enhances an existing todolist with detailed specifications, acceptance criteria, and technical requirements
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';

import { ToolRegistration } from './types.js';
import { ProjectContextManager } from '../context/index.js';
import { enhanceTodolist } from '../utils/llm-utils.js';
import { fileExists, readFile, createFile } from '../utils/file-utils.js';
import { resolveWorkspacePath, getSanitizedFilename } from '../utils/path-utils.js';

/**
 * Register the enhance_todolist tool
 * @param server The MCP server
 */
export const registerEnhanceTodoTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'enhance_todolist',
    description: 'Enhance an existing todolist with more detailed specifications, acceptance criteria, and technical requirements. Will not overwrite existing files unless overwrite=true.',
    parameters: z.object({
      input_file: z.string().describe('Path to the todolist markdown file to enhance'),
      output_file: z.string().optional().describe('Optional file path to save the enhanced todolist (default: <input_file>_enhanced.md)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if output file exists (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { input_file, overwrite = false, workspace_root } = args;
        
        // Resolve the input path
        const resolvedInputPath = resolveWorkspacePath(workspace_root, input_file);
        
        // Check if input file exists
        if (!await fileExists(resolvedInputPath)) {
          return `Error: Input file "${resolvedInputPath}" does not exist.`;
        }
        
        // Read the content of the input todolist file
        const todolistContent = await readFile(resolvedInputPath);
        if (!todolistContent) {
          return `Error: Failed to read content from "${resolvedInputPath}".`;
        }
        
        // Generate a file name for the output if not provided
        const output_file = args.output_file || generateOutputFileName(input_file);
        
        // Resolve the output path
        const resolvedOutputPath = resolveWorkspacePath(workspace_root, output_file);
        
        // Check for output file existence
        if (!overwrite && await fileExists(resolvedOutputPath)) {
          return `Error: Output file "${resolvedOutputPath}" already exists. Set overwrite=true to overwrite.`;
        }
        
        // Enhance todolist using the IDE's LLM
        const enhancedTodolist = await enhanceTodolist(todolistContent);
        
        // Ensure the output directory exists and write the file
        const result = await createFile(resolvedOutputPath, enhancedTodolist, overwrite);
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(resolvedOutputPath, path.extname(resolvedOutputPath)),
          path.dirname(resolvedOutputPath)
        );
        
        // Return success response
        const response = `Successfully enhanced todolist and saved to "${resolvedOutputPath}".\n\n${enhancedTodolist}\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to enhance todolist - ${errorMessage}`;
      }
    },
  });
};

/**
 * Generates an output file name based on the input file name
 * @param inputFile The input file path
 * @returns A suggested output file name
 */
function generateOutputFileName(inputFile: string): string {
  const parsedPath = path.parse(inputFile);
  const baseName = parsedPath.name;
  const extension = parsedPath.ext;
  
  // If the filename already contains 'todo', add '_enhanced' before the extension
  if (baseName.toLowerCase().includes('todo')) {
    return `${baseName}_enhanced${extension}`;
  }
  
  // Otherwise, append '_enhanced_todo' before the extension
  return `${baseName}_enhanced_todo${extension}`;
} 