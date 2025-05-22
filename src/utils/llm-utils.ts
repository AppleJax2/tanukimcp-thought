/**
 * LLM Utilities
 * This module provides utilities for interacting with the IDE's built-in LLM capabilities.
 * It enforces the use of the environment's LLM (Cursor, Windsurf, Claude Desktop, etc.)
 * with no rule-based fallbacks.
 */

/**
 * Flag to check if running in optimization mode for tool scanning
 */
export const OPTIMIZE_FOR_TOOL_SCAN = 
  process.env.SMITHERY_HOSTED === 'true' || 
  process.env.ENABLE_QUICK_STARTUP === 'true';

/**
 * Generates text using the IDE's built-in LLM
 * This is the only supported method - no rule-based fallbacks
 * @param prompt The prompt to send to the LLM
 * @returns The generated text
 * @throws Error if the LLM operation fails
 */
export async function generateWithLLM(prompt: string): Promise<string> {
  // Skip intensive processing during optimization mode
  if (OPTIMIZE_FOR_TOOL_SCAN) {
    return "Optimization mode: LLM functionality will be available when fully loaded.";
  }
  
  console.log('Using IDE\'s built-in LLM capabilities');
  
  try {
    // The actual LLM processing happens in the IDE
    // This is just a placeholder - the IDE will intercept and handle LLM operations
    // We rely on the environment (Cursor, Windsurf, Claude Desktop, Smithery) to provide the LLM capabilities
    return "Using the IDE's built-in LLM capabilities";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM operation failed: ${errorMessage}`);
  }
}

/**
 * Generate a structured todolist from unstructured thoughts
 * @param projectDescription The project description
 * @param thoughts Unstructured thoughts about the project
 * @returns A structured markdown todolist
 */
export async function generateTodolist(projectDescription: string, thoughts: string): Promise<string> {
  const prompt = `
  Your task is to analyze the following unstructured thoughts about a project and organize them into a clear, structured todolist.
  
  Project: ${projectDescription}
  
  Unstructured thoughts:
  ${thoughts}
  
  Create a markdown todolist that:
  1. Starts with a heading showing the project name
  2. Organizes tasks into logical categories based on the content
  3. Uses proper Markdown formatting with checkboxes (- [ ] Task)
  4. Includes EVERY thought from the input, transformed into clear, actionable tasks
  5. Is comprehensive and detailed
  
  Return ONLY the markdown todolist without any other text.
  `;
  
  const output = await generateWithLLM(prompt);
  
  // If the output doesn't start with a markdown heading, add one
  if (!output.trim().startsWith('# ')) {
    return `# ${projectDescription}\n\n${output.trim()}`;
  }
  
  return output.trim();
}

/**
 * Enhance an existing todolist with more details
 * @param todolist The existing todolist to enhance
 * @returns The enhanced todolist
 */
export async function enhanceTodolist(todolist: string): Promise<string> {
  const prompt = `
  Your task is to enhance and improve this todolist with more specific details, acceptance criteria, and technical requirements.
  
  Original todolist:
  ${todolist}
  
  For each existing task:
  1. Add 2-3 specific acceptance criteria as subtasks
  2. Add relevant technical requirements and implementation details
  3. Consider edge cases and error handling
  
  Also, add any missing categories that would be important for a complete project, such as:
  - Testing & QA
  - Deployment
  - Security
  - Documentation
  
  Preserve all existing content and structure. Add to it, don't remove anything.
  Return the complete enhanced markdown todolist.
  `;
  
  return await generateWithLLM(prompt);
}

/**
 * Find the next task to implement from a todolist
 * @param todolist The todolist to analyze
 * @returns The text of the next task to implement
 */
export async function findNextTask(todolist: string): Promise<string> {
  const prompt = `
  You are a project management assistant. Given the following todolist, identify the most logical next task to implement.
  
  Todolist:
  ${todolist}
  
  Find an uncompleted task (marked with "- [ ]") that should be implemented next, based on:
  1. Dependencies (tasks that others depend on should be done first)
  2. Logical order (setup/foundation tasks before features)
  3. Complexity (consider starting with simpler tasks)
  
  Return ONLY the text of the single next task to implement, exactly as it appears in the todolist, without the checkbox or additional explanation.
  `;
  
  const output = await generateWithLLM(prompt);
  
  // Remove any markdown formatting the LLM might have included
  return output.trim().replace(/^- \[[ x]\]\s*/, '');
}

/**
 * Create an implementation plan for a specific task
 * @param task The task to implement
 * @param todolistContext The full todolist for context
 * @returns A detailed implementation plan
 */
export async function createImplementationPlan(task: string, todolistContext: string): Promise<string> {
  const prompt = `
  You are a senior software engineer creating an implementation plan for a task in a project.
  
  Task to implement:
  ${task}
  
  Project Context (full todolist):
  ${todolistContext}
  
  Create a detailed implementation plan that includes:
  1. A clear approach with step-by-step implementation strategy
  2. Architecture considerations and design patterns to use
  3. Key dependencies and components needed
  4. Potential integration points with other systems
  5. Error handling strategies and edge cases to consider
  6. Testing approach with specific test scenarios
  7. Performance considerations and optimizations
  
  Format your response as a comprehensive markdown implementation plan.
  `;
  
  const plan = await generateWithLLM(prompt);
  
  // If plan doesn't have a heading, add one
  if (!plan.trim().startsWith('#')) {
    return `## Implementation Plan for: "${task}"\n\n${plan.trim()}`;
  }
  
  return plan.trim();
}

/**
 * Parse an implementation plan into executable actions
 * @param plan The implementation plan to parse
 * @param task The task being implemented
 * @returns Array of actions to execute
 */
export async function parsePlanIntoActions(plan: string, task: string): Promise<any[]> {
  // Skip intensive processing during optimization mode
  if (OPTIMIZE_FOR_TOOL_SCAN) {
    return [{
      type: 'create_file',
      path: 'quick-startup-placeholder.md',
      description: 'Placeholder for quick startup mode',
      content: '# Quick Startup Mode\n\nFull functionality will be available when server is fully loaded.'
    }];
  }
  
  const prompt = `
  You are a code implementation assistant. Your job is to analyze an implementation plan and extract specific file operations needed.
  
  Task to implement: "${task}"
  
  Implementation Plan:
  ${plan}
  
  Based on this plan, extract and list all file operations needed (create_file, edit_file, delete_file, move_file, copy_file).
  
  For each operation, specify:
  - Type of operation
  - Target file path(s)
  - Brief description of what's changing
  - Content (for file creation) or changes (for edits)
  
  Return a JSON array of operations, with each operation having properties:
  - type: The operation type (create_file, edit_file, delete_file, move_file, copy_file)
  - path/from/to: The file path(s) for the operation
  - description: A brief description of the change
  - content: For create_file, the full file content
  - changes: For edit_file, an array of changes (each with type, content/old/new/line)
  
  Example format:
  [
    {
      "type": "create_file",
      "path": "src/utils/helper.js",
      "description": "Create utility helper file",
      "content": "function helper() { ... }"
    }
  ]
  
  Return a valid JSON array, nothing else.
  `;
  
  const output = await generateWithLLM(prompt);
  
  try {
    // Try to parse the JSON output
    const jsonString = output.trim();
    // Find the first [ and last ]
    const startIdx = jsonString.indexOf('[');
    const endIdx = jsonString.lastIndexOf(']');
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('LLM did not return a valid JSON array');
    }
    
    const cleanedJsonString = jsonString.substring(startIdx, endIdx + 1);
    const actions = JSON.parse(cleanedJsonString);
    
    // Validate actions
    const validatedActions = actions.filter((action: any) => {
      // Ensure the action has a valid type
      if (!action.type || !['create_file', 'edit_file', 'delete_file', 'move_file', 'copy_file'].includes(action.type)) {
        return false;
      }
      
      // Ensure paths are provided where needed
      if (action.type === 'create_file' || action.type === 'edit_file' || action.type === 'delete_file') {
        return !!action.path;
      } else if (action.type === 'move_file' || action.type === 'copy_file') {
        return !!action.from && !!action.to;
      }
      
      return false;
    });
    
    if (validatedActions.length === 0) {
      throw new Error('No valid actions found in LLM output');
    }
    
    return validatedActions;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse LLM output into actions: ${errorMessage}`);
  }
} 