/**
 * Task Executor Tool
 * Executes a planned task by implementing necessary file operations
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

import { ToolRegistration } from './types.js';
import { ProjectContextManager } from '../context/index.js';
import { createImplementationPlan, parsePlanIntoActions } from '../utils/llm-utils.js';
import { 
  fileExists, readFile, createFile, editFile,
  deleteFile, moveFile, copyFile, createDirectory
} from '../utils/file-utils.js';
import { resolveWorkspacePath, ensureRelativePath } from '../utils/path-utils.js';

/**
 * Register the task_executor tool
 * @param server The MCP server
 */
export const registerTaskExecutorTool: ToolRegistration = (server: FastMCP) => {
  server.addTool({
    name: 'task_executor',
    description: 'Execute a planned task by implementing the necessary file operations based on the implementation plan. Use validate_plan=true to preview actions without executing them.',
    parameters: z.object({
      task: z.string().describe('The task to implement (text of the task from the todolist)'),
      todolist_file: z.string().describe('Path to the todolist markdown file for context'),
      target_directory: z.string().describe('Target directory for file operations (relative to workspace root)'),
      plan_file: z.string().optional().describe('Optional path to a plan file (if not provided, one will be generated)'),
      validate_plan: z.boolean().optional().describe('If true, just validate the plan without executing it (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args, req) => {
      try {
        const { task, todolist_file, target_directory, plan_file, validate_plan = false, workspace_root } = args;
        
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
        
        // Resolve target directory
        const resolvedTargetDir = resolveWorkspacePath(workspace_root, target_directory);
        
        // Ensure target directory exists
        if (!existsSync(resolvedTargetDir)) {
          await fs.mkdir(resolvedTargetDir, { recursive: true });
        }
        
        // Get implementation plan (either from file or generate new)
        let implementationPlan: string;
        
        if (plan_file) {
          // Use existing plan file
          const resolvedPlanPath = resolveWorkspacePath(workspace_root, plan_file);
          
          if (!await fileExists(resolvedPlanPath)) {
            return `Error: Plan file "${resolvedPlanPath}" does not exist.`;
          }
          
          implementationPlan = await readFile(resolvedPlanPath);
          if (!implementationPlan) {
            return `Error: Failed to read plan from "${resolvedPlanPath}".`;
          }
        } else {
          // Generate a new implementation plan
          const todolistContent = await readFile(resolvedTodolistPath);
          if (!todolistContent) {
            return `Error: Failed to read content from "${resolvedTodolistPath}".`;
          }
          
          implementationPlan = await createImplementationPlan(task, todolistContent);
        }
        
        // Parse the plan into executable actions
        const actions = await parsePlanIntoActions(implementationPlan, task);
        
        // Validate mode - just show the actions without executing
        if (validate_plan) {
          const actionsDescription = actions.map((action: any, index: number) => {
            if (action.type === 'create_file') {
              return `${index + 1}. CREATE FILE: ${path.join(target_directory, ensureRelativePath(action.path))}`;
            } else if (action.type === 'edit_file') {
              return `${index + 1}. EDIT FILE: ${path.join(target_directory, ensureRelativePath(action.path))}`;
            } else if (action.type === 'delete_file') {
              return `${index + 1}. DELETE FILE: ${path.join(target_directory, ensureRelativePath(action.path))}`;
            } else if (action.type === 'move_file') {
              return `${index + 1}. MOVE FILE: ${path.join(target_directory, ensureRelativePath(action.from))} → ${path.join(target_directory, ensureRelativePath(action.to))}`;
            } else if (action.type === 'copy_file') {
              return `${index + 1}. COPY FILE: ${path.join(target_directory, ensureRelativePath(action.from))} → ${path.join(target_directory, ensureRelativePath(action.to))}`;
            }
            return `${index + 1}. UNKNOWN ACTION: ${action.type}`;
          }).join('\n');
          
          return `Plan validation for task "${task}":\n\n${actions.length} actions to execute:\n\n${actionsDescription}\n\nTo execute these actions, run this tool again with validate_plan=false.`;
        }
        
        // Execute the actions
        const results = [];
        
        for (const action of actions) {
          const actionType = action.type;
          
          if (actionType === 'create_file') {
            const filePath = path.join(resolvedTargetDir, ensureRelativePath(action.path));
            const result = await createFile(filePath, action.content, true);
            results.push(`Created file: ${filePath}`);
          } else if (actionType === 'edit_file') {
            const filePath = path.join(resolvedTargetDir, ensureRelativePath(action.path));
            if (await fileExists(filePath)) {
              const result = await editFile(filePath, action.changes);
              results.push(`Edited file: ${filePath}`);
            } else {
              results.push(`Warning: Cannot edit non-existent file: ${filePath}`);
            }
          } else if (actionType === 'delete_file') {
            const filePath = path.join(resolvedTargetDir, ensureRelativePath(action.path));
            if (await fileExists(filePath)) {
              const result = await deleteFile(filePath);
              results.push(`Deleted file: ${filePath}`);
            } else {
              results.push(`Warning: Cannot delete non-existent file: ${filePath}`);
            }
          } else if (actionType === 'move_file') {
            const fromPath = path.join(resolvedTargetDir, ensureRelativePath(action.from));
            const toPath = path.join(resolvedTargetDir, ensureRelativePath(action.to));
            if (await fileExists(fromPath)) {
              const result = await moveFile(fromPath, toPath, true);
              results.push(`Moved file: ${fromPath} → ${toPath}`);
            } else {
              results.push(`Warning: Cannot move non-existent file: ${fromPath}`);
            }
          } else if (actionType === 'copy_file') {
            const fromPath = path.join(resolvedTargetDir, ensureRelativePath(action.from));
            const toPath = path.join(resolvedTargetDir, ensureRelativePath(action.to));
            if (await fileExists(fromPath)) {
              const result = await copyFile(fromPath, toPath, true);
              results.push(`Copied file: ${fromPath} → ${toPath}`);
            } else {
              results.push(`Warning: Cannot copy non-existent file: ${fromPath}`);
            }
          }
        }
        
        // Update project context
        ProjectContextManager.getInstance().setCurrentProject(
          path.basename(todolist_file, path.extname(todolist_file)),
          resolvedTargetDir
        );
        
        // Return success response
        const response = `Successfully executed ${results.length} operations for task "${task}".\n\nResults:\n${results.join('\n')}\n\nNext steps:\n1. Review the implemented files\n2. Test the implementation\n3. Mark the task as complete using the mark_task_complete tool\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]`;
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error: Failed to execute task - ${errorMessage}`;
      }
    },
  });
}; 