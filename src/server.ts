import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Interface to represent a todolist item
 */
interface TodoItem {
  text: string;
  checked: boolean;
  level: number;
  children: TodoItem[];
}

/**
 * Generic error handler to provide consistent error reporting
 */
const handleError = (error: unknown, message: string): string => {
  console.error(`Error: ${message}`, error);
  return `Error: ${message} - ${error instanceof Error ? error.message : String(error)}`;
};

/**
 * Check if a file exists and is accessible
 */
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Creates the Tanuki Sequential Thought MCP server
 * Implements tools for the Sequential Prompting Framework
 */
export function createTanukiServer() {
  // Create a server with required options
  const server = new FastMCP({
    name: 'tanukimcp-thought',
    version: '1.0.0',
  });

  // Phase 1: Brain Dump & Initial Organization
  server.addTool({
    name: 'brain_dump_organize',
    description: 'Transform unstructured thoughts into a structured markdown todolist.',
    parameters: z.object({
      project_description: z.string().describe('Brief description of the project'),
      unstructured_thoughts: z.string().describe('Unstructured thoughts, ideas, and considerations about the project'),
      output_file: z.string().optional().describe('Optional file path to save the todolist (default: tooltodo.md)'),
    }),
    execute: async (args) => {
      try {
        const { project_description, unstructured_thoughts, output_file = 'tooltodo.md' } = args;
        
        // Validate inputs
        if (!project_description.trim()) {
          return 'Error: Project description cannot be empty.';
        }
        
        if (!unstructured_thoughts.trim()) {
          return 'Error: Unstructured thoughts cannot be empty.';
        }
        
        // Create a basic structured todolist
        // In a real implementation, this would use AI to transform the thoughts
        const todolist = `# ${project_description}\n\n## Project Todolist\n\n### Core Components\n- [ ] Component 1\n  - Core functionality description\n  - Integration points with other components\n  - Error-handling considerations\n  - Performance considerations\n- [ ] Component 2\n  - Core functionality description\n  - Integration points with other components\n  - Error-handling considerations\n  - Performance considerations\n\n### Implementation Tasks\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n`;
        
        // Ensure the output directory exists
        const dir = path.dirname(output_file);
        if (dir !== '.' && !existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        
        // Write the todolist to file
        await fs.writeFile(output_file, todolist, 'utf-8');
        
        return `Successfully created todolist and saved to "${output_file}".\n\n${todolist}`;
      } catch (error) {
        return handleError(error, 'Failed to create and save todolist');
      }
    },
  });

  // Phase 2: Enhance & Refine
  server.addTool({
    name: 'enhance_todolist',
    description: 'Enhance an existing todolist with more detailed specifications, acceptance criteria, and technical requirements.',
    parameters: z.object({
      input_file: z.string().describe('Path to the existing todolist file'),
      output_file: z.string().optional().describe('Optional file path to save the enhanced todolist (defaults to overwriting input file)'),
    }),
    execute: async (args) => {
      try {
        const { input_file, output_file } = args;
        
        // Validate file exists
        if (!(await fileExists(input_file))) {
          return `Error: Input file "${input_file}" does not exist or is not accessible.`;
        }
        
        // Read the existing todolist
        const existingTodolist = await fs.readFile(input_file, 'utf-8');
        
        // In a real implementation, this would use AI to enhance the todolist
        // For now, we'll add placeholder enhancements
        const enhancedTodolist = existingTodolist + `
## Enhancement Additions

### Integration & API Standards
- [ ] Define API response formats
- [ ] Establish error handling patterns
- [ ] Document integration points

### Performance & Security Considerations
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Consider caching strategies

### Data Models & State Management
- [ ] Define core data models
- [ ] Document state transitions
- [ ] Implement data validation
`;
        
        // Determine output file
        const targetFile = output_file || input_file;
        
        // Ensure the output directory exists
        const dir = path.dirname(targetFile);
        if (dir !== '.' && !existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        
        // Write the enhanced todolist
        await fs.writeFile(targetFile, enhancedTodolist, 'utf-8');
        
        return `Successfully enhanced todolist and saved to "${targetFile}".\n\n${enhancedTodolist}`;
      } catch (error) {
        return handleError(error, 'Failed to enhance todolist');
      }
    },
  });

  // Phase 3: Sequential Task Implementation - Find Next Task
  server.addTool({
    name: 'find_next_task',
    description: 'Identify the next logical unchecked task to implement from the todolist.',
    parameters: z.object({
      todolist_file: z.string().describe('Path to the todolist file'),
    }),
    execute: async (args) => {
      try {
        const { todolist_file } = args;
        
        // Validate file exists
        if (!(await fileExists(todolist_file))) {
          return `Error: Todolist file "${todolist_file}" does not exist or is not accessible.`;
        }
        
        // Read the todolist
        const todolist = await fs.readFile(todolist_file, 'utf-8');
        
        // In a real implementation, an AI would prioritize which task to do next
        // For now, simply find the first unchecked task
        const uncheckedTaskRegex = /- \[ \] (.+)$/m;
        const match = todolist.match(uncheckedTaskRegex);
        
        if (match && match[1]) {
          return `Next task to implement: "${match[1]}"\n\nContext from todolist:\n${todolist}`;
        } else {
          return `No unchecked tasks found in the todolist. All tasks appear to be completed.\n\nTodolist content:\n${todolist}`;
        }
      } catch (error) {
        return handleError(error, 'Failed to find next task');
      }
    },
  });

  // Phase 3: Sequential Task Implementation - Plan Task
  server.addTool({
    name: 'plan_task_implementation',
    description: 'Create a detailed implementation plan for a specific task.',
    parameters: z.object({
      task: z.string().describe('The task to plan implementation for'),
      todolist_file: z.string().describe('Path to the todolist file for context'),
    }),
    execute: async (args) => {
      try {
        const { task, todolist_file } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Validate file exists
        if (!(await fileExists(todolist_file))) {
          return `Error: Todolist file "${todolist_file}" does not exist or is not accessible.`;
        }
        
        // Read the todolist for context
        const todolist = await fs.readFile(todolist_file, 'utf-8');
        
        // Check if the task exists in the todolist
        if (!todolist.includes(task)) {
          return `Warning: The specified task "${task}" was not found in the todolist. This plan may lack proper context.\n\n` + createImplementationPlan(task);
        }
        
        // In a real implementation, this would use AI to generate a detailed plan
        return createImplementationPlan(task);
      } catch (error) {
        return handleError(error, 'Failed to create implementation plan');
      }
    },
  });

  // Phase 3: Sequential Task Implementation - Mark Task Complete
  server.addTool({
    name: 'mark_task_complete',
    description: 'Mark a specific task as complete in the todolist.',
    parameters: z.object({
      task: z.string().describe('The task text to mark as complete'),
      todolist_file: z.string().describe('Path to the todolist file'),
    }),
    execute: async (args) => {
      try {
        const { task, todolist_file } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Validate file exists
        if (!(await fileExists(todolist_file))) {
          return `Error: Todolist file "${todolist_file}" does not exist or is not accessible.`;
        }
        
        // Read the todolist
        const todolist = await fs.readFile(todolist_file, 'utf-8');
        
        // Create a regex to find the exact task
        const taskRegex = new RegExp(`- \\[ \\] ${task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        const updatedTodolist = todolist.replace(taskRegex, `- [x] ${task}`);
        
        // Check if any replacements were made
        if (todolist === updatedTodolist) {
          return `Task "${task}" was not found in the todolist as an unchecked task. It might be already completed or might not exist exactly as specified.`;
        }
        
        // Write the updated todolist
        await fs.writeFile(todolist_file, updatedTodolist, 'utf-8');
        
        return `Successfully marked task "${task}" as complete.\n\nUpdated todolist:\n${updatedTodolist}`;
      } catch (error) {
        return handleError(error, 'Failed to mark task as complete');
      }
    },
  });

  // Auxiliary Tool: Sequential Thinking Process
  server.addTool({
    name: 'sequential_thinking',
    description: 'Apply the sequential thinking process to break down a complex problem.',
    parameters: z.object({
      problem: z.string().describe('The complex problem or question to analyze'),
      steps: z.number().optional().describe('Number of thinking steps to perform (default: 3)'),
    }),
    execute: async (args) => {
      try {
        const { problem, steps = 3 } = args;
        
        // Validate inputs
        if (!problem.trim()) {
          return 'Error: Problem description cannot be empty.';
        }
        
        if (steps < 1 || steps > 10) {
          return 'Error: Steps must be between 1 and 10.';
        }
        
        // In a real implementation, this would use AI to apply sequential thinking
        // For now, generate a placeholder thinking process
        let result = `# Sequential Thinking Analysis: ${problem}\n\n`;
        
        for (let i = 1; i <= steps; i++) {
          result += `## Step ${i}: ${getThinkingStepTitle(i)}\n`;
          result += getThinkingStepContent(i, problem) + '\n\n';
        }
        
        result += `## Conclusion\nThis sequential analysis has broken down the problem "${problem}" into manageable components. The insights from each step build upon each other, creating a comprehensive understanding and approach. This structured thinking approach helps ensure all aspects are considered methodically.`;
        
        return result;
      } catch (error) {
        return handleError(error, 'Failed to apply sequential thinking');
      }
    },
  });
  
  return server;
}

/**
 * Helper function to create a detailed implementation plan
 */
function createImplementationPlan(task: string): string {
  return `
## Implementation Plan for: "${task}"

### Approach
The implementation will follow a step-by-step approach, breaking down the task into manageable components and addressing each methodically.

### Architecture
The solution will integrate with existing systems where appropriate while maintaining clean separation of concerns and following SOLID principles.

### Dependencies
- Primary system components
- External libraries as needed
- Documentation and reference materials

### Integration Points
- User interface components
- Backend services
- Data persistence layer
- Error handling system

### Error Handling
Comprehensive error detection and recovery mechanisms will be implemented, including:
- Input validation
- Exception handling
- Graceful degradation
- User feedback mechanisms

### Testing
Testing will include:
- Unit tests for core functionality
- Integration tests for system interactions
- User acceptance criteria validation
- Edge case and boundary testing

### Performance Considerations
- Efficiency of algorithms and data structures
- Resource utilization monitoring
- Caching strategies where appropriate
- Scalability concerns and mitigations
`;
}

/**
 * Helper function to generate thinking step titles
 */
function getThinkingStepTitle(step: number): string {
  const titles = [
    "Initial Problem Definition",
    "Breaking Down Components",
    "Analyzing Relationships",
    "Identifying Constraints",
    "Exploring Solutions",
    "Evaluating Options",
    "Considering Implementation",
    "Anticipating Challenges",
    "Integration Planning",
    "Refinement and Optimization"
  ];
  
  return titles[step - 1] || `Thinking Step ${step}`;
}

/**
 * Helper function to generate thinking step content
 */
function getThinkingStepContent(step: number, problem: string): string {
  const stepContents = [
    `In this initial step, we define the problem clearly: "${problem}". Understanding the core issue is essential before attempting to solve it. This involves identifying what we know, what we need to find out, and the desired outcome.`,
    
    `Breaking down the problem into smaller, manageable components helps in understanding the structure. Each component can be analyzed individually while keeping in mind how they fit together in the larger context.`,
    
    `Exploring the relationships between different components reveals dependencies, conflicts, and synergies. This step highlights how changes in one area might affect others, ensuring a holistic approach to the solution.`,
    
    `Identifying constraints, limitations, and boundaries clarifies what solutions are feasible. This includes technical limitations, resource constraints, time factors, and other practical considerations.`,
    
    `With a clear understanding of the problem structure, we can begin exploring potential solutions. This involves creative thinking and drawing on existing knowledge and patterns that might apply to the current problem.`,
    
    `Evaluating each option against our criteria and constraints helps identify the most promising approaches. This comparison considers effectiveness, efficiency, feasibility, and alignment with goals.`,
    
    `Considering how the solution would be implemented uncovers practical aspects that might influence the choice of approach. This includes resources needed, steps required, and potential pitfalls.`,
    
    `Anticipating challenges and preparing for them improves the robustness of the solution. This proactive approach addresses potential points of failure before they become problems.`,
    
    `Planning how the solution integrates with existing systems and processes ensures smooth adoption. This considers interfaces, dependencies, and transition strategies.`,
    
    `Final refinements optimize the solution for efficiency, elegance, and maintainability. This polishing phase enhances the quality and sustainability of the solution.`
  ];
  
  return stepContents[step - 1] || `This is step ${step} of the sequential thinking process for the problem: "${problem}". In this step, we analyze the problem from a new perspective, building on previous insights and moving closer to a comprehensive solution.`;
} 