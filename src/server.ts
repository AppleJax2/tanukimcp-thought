import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Required model for the tool to function
const REQUIRED_MODEL = 'deepseek-r1';

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
 * Task category with items
 */
interface TaskCategory {
  name: string;
  items: string[];
}

/**
 * Ollama parameters for model inference
 */
interface OllamaParams {
  num_ctx?: number;
  temperature?: number;
  top_p?: number;
  num_thread?: number;
}

/**
 * Configuration options
 */
interface Config {
  llmModel: string;
  ollamaParams?: OllamaParams;
  autoCreateConfig?: boolean;
}

// Default configuration
const defaultConfig: Config = {
  llmModel: REQUIRED_MODEL,
  ollamaParams: {
    num_ctx: 16384,
    temperature: 0.7,
    num_thread: 8
  },
  autoCreateConfig: true
};

// Try to load user config
let userConfig: Config = defaultConfig;
try {
  if (existsSync('tanuki-config.json')) {
    const configFile = fs.readFile('tanuki-config.json', 'utf-8');
    userConfig = JSON.parse(await configFile);
  } else {
    // Create default config file if it doesn't exist and auto-create is enabled
    if (defaultConfig.autoCreateConfig) {
      await createDefaultConfigFile();
    }
  }
} catch (error) {
  console.error('Error loading config:', error);
}

/**
 * Creates a default configuration file with optimized settings
 */
async function createDefaultConfigFile() {
  try {
    const configContent = JSON.stringify({
      llmModel: defaultConfig.llmModel,
      ollamaParams: defaultConfig.ollamaParams
    }, null, 2);
    
    await fs.writeFile('tanuki-config.json', configContent, 'utf-8');
    console.log('Created default configuration file: tanuki-config.json');
  } catch (error) {
    console.error('Failed to create default configuration file:', error);
  }
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
 * Builds a string of Ollama parameters for the command line
 */
function buildOllamaParamsString(): string {
  if (!userConfig.ollamaParams) {
    return '';
  }
  
  const params = [];
  
  if (userConfig.ollamaParams.num_ctx) {
    params.push(`-c ${userConfig.ollamaParams.num_ctx}`);
  }
  
  if (userConfig.ollamaParams.temperature !== undefined) {
    params.push(`--temperature ${userConfig.ollamaParams.temperature}`);
  }
  
  if (userConfig.ollamaParams.top_p !== undefined) {
    params.push(`--top-p ${userConfig.ollamaParams.top_p}`);
  }
  
  if (userConfig.ollamaParams.num_thread) {
    params.push(`--num-thread ${userConfig.ollamaParams.num_thread}`);
  }
  
  return params.join(' ');
}

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

  // Helper function to check Ollama requirements only when needed
  async function ensureOllamaRequirements() {
    try {
      console.log('Checking for Ollama installation...');
      await execAsync('ollama --version');
      
      console.log(`Checking for ${REQUIRED_MODEL} model...`);
      const { stdout } = await execAsync('ollama list');
      
      if (!stdout.includes(REQUIRED_MODEL)) {
        throw new Error(`Required model "${REQUIRED_MODEL}" not found. Please run: ollama pull ${REQUIRED_MODEL}`);
      }
      
      console.log('✅ Ollama and required model verified!');
      return true;
    } catch (error) {
      console.error('\n=== TANUKI SEQUENTIAL THOUGHT MCP REQUIREMENTS ===');
      console.error('ERROR: Ollama is required for this tool to function.');
      console.error('Please install Ollama from https://ollama.ai/');
      console.error(`Then run: ollama pull ${REQUIRED_MODEL}`);
      console.error('\nFor development purposes only, you can bypass this check by modifying');
      console.error('the checkOllamaRequirements function in src/server.ts to return without error.');
      console.error('======================================================\n');
      throw error;
    }
  }

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
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Generate todolist with LLM
        const todolist = await generateTodoWithLLM(project_description, unstructured_thoughts);
        
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

  // LLM-based todo generation
  async function generateTodoWithLLM(projectDescription: string, thoughts: string): Promise<string> {
    try {
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
      
      // Build Ollama parameters
      const ollamaParamsString = buildOllamaParamsString();
      
      // Run Ollama with parameters
      const { stdout } = await execAsync(`ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`);
      
      // Clean up the output to ensure it's valid markdown
      let output = stdout.trim();
      
      // If the output doesn't start with a markdown heading, add one
      if (!output.startsWith('# ')) {
        output = `# ${projectDescription}\n\n${output}`;
      }
      
      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM generation failed: ${errorMessage}`);
    }
  }
  
  // Rule-based todo generation
  function generateTodoWithRules(projectDescription: string, thoughts: string): string {
    // Extract lines and clean them up
    const lines = thoughts
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Process lines to extract tasks
    const tasks: string[] = [];
    for (const line of lines) {
      // Remove bullet points, dashes, etc.
      let task = line
        .replace(/^[-•*]\s*/, '')  // Remove bullet points
        .replace(/^\d+[.)]\s*/, '') // Remove numbered list markers
        .trim();
      
      if (task) {
        tasks.push(task);
      }
    }
    
    // Categorize tasks based on keywords
    const categories: TaskCategory[] = categorizeTasksByKeywords(tasks);
    
    // Generate the todolist markdown
    let todolist = `# ${projectDescription}\n\n## Project Todolist\n\n`;
    
    // Add categories and tasks
    categories.forEach(category => {
      todolist += `### ${category.name}\n`;
      category.items.forEach(item => {
        todolist += `- [ ] ${item}\n`;
      });
      todolist += '\n';
    });
    
    // Add any uncategorized tasks
    const uncategorizedTasks = tasks.filter(task => 
      !categories.some(category => 
        category.items.includes(task)
      )
    );
    
    if (uncategorizedTasks.length > 0) {
      todolist += `### Other Tasks\n`;
      uncategorizedTasks.forEach(task => {
        todolist += `- [ ] ${task}\n`;
      });
      todolist += '\n';
    }
    
    return todolist;
  }
  
  // Categorize tasks based on keywords
  function categorizeTasksByKeywords(tasks: string[]): TaskCategory[] {
    const categories: TaskCategory[] = [];
    
    // Define categories and their keywords
    const categoryKeywords = [
      { name: 'Frontend/UI', keywords: ['ui', 'interface', 'frontend', 'display', 'view', 'component', 'screen', 'responsive', 'mobile', 'design', 'layout', 'style', 'css', 'html'] },
      { name: 'Backend/API', keywords: ['api', 'backend', 'server', 'endpoint', 'route', 'controller', 'service', 'database', 'query', 'model', 'schema'] },
      { name: 'Authentication', keywords: ['auth', 'authentication', 'login', 'register', 'user', 'permission', 'role', 'access', 'security', 'password', 'token', 'jwt'] },
      { name: 'Data Management', keywords: ['data', 'database', 'storage', 'persist', 'model', 'entity', 'record', 'table', 'document', 'collection'] },
      { name: 'Testing', keywords: ['test', 'testing', 'unit', 'integration', 'e2e', 'end-to-end', 'qa', 'quality', 'assert', 'expect', 'mock', 'stub', 'coverage'] },
      { name: 'Deployment', keywords: ['deploy', 'deployment', 'ci', 'cd', 'pipeline', 'build', 'release', 'server', 'host', 'container', 'docker', 'kubernetes'] },
    ];
    
    // Initialize categories
    categoryKeywords.forEach(cat => {
      categories.push({
        name: cat.name,
        items: []
      });
    });
    
    // Assign tasks to categories based on keywords
    tasks.forEach(task => {
      const taskLower = task.toLowerCase();
      let assigned = false;
      
      for (const category of categories) {
        const catIndex = categoryKeywords.findIndex(c => c.name === category.name);
        if (catIndex !== -1) {
          const keywords = categoryKeywords[catIndex].keywords;
          
          if (keywords.some(keyword => taskLower.includes(keyword))) {
            category.items.push(task);
            assigned = true;
            break;  // Assign to first matching category only
          }
        }
      }
    });
    
    // Filter out empty categories
    return categories.filter(category => category.items.length > 0);
  }

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
        const { input_file, output_file = input_file } = args;
        
        // Validate file exists
        if (!(await fileExists(input_file))) {
          return `Error: Input file "${input_file}" does not exist or is not accessible.`;
        }
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the existing todolist
        const existingTodolist = await fs.readFile(input_file, 'utf-8');
        
        // Generate enhanced todolist with LLM
        const enhancedTodolist = await enhanceTodoWithLLM(existingTodolist);
        
        // Ensure the output directory exists
        const dir = path.dirname(output_file);
        if (dir !== '.' && !existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        
        // Write the enhanced todolist to file
        await fs.writeFile(output_file, enhancedTodolist, 'utf-8');
        
        return `Successfully enhanced todolist and saved to "${output_file}".\n\n${enhancedTodolist}`;
      } catch (error) {
        return handleError(error, 'Failed to enhance todolist');
      }
    },
  });
  
  // LLM-based todolist enhancement
  async function enhanceTodoWithLLM(existingTodolist: string): Promise<string> {
    try {
      const prompt = `
      Your task is to enhance and improve this todolist with more specific details, acceptance criteria, and technical requirements.
      
      Original todolist:
      ${existingTodolist}
      
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
      
      // Build Ollama parameters
      const ollamaParamsString = buildOllamaParamsString();
      
      // Run Ollama with parameters
      const { stdout } = await execAsync(`ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`);
      
      // Clean up the output and ensure it's valid markdown
      let output = stdout.trim();
      
      // If the output doesn't seem like proper markdown, use the rule-based fallback
      if (!output.includes('# ') && !output.includes('- [ ]')) {
        console.warn('Warning: LLM output was not valid markdown, using rule-based enhancement as fallback');
        return enhanceTodoWithRules(existingTodolist);
      }
      
      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: LLM enhancement failed: ${errorMessage}, using rule-based fallback`);
      return enhanceTodoWithRules(existingTodolist);
    }
  }
  
  // Rule-based todolist enhancement
  function enhanceTodoWithRules(existingTodolist: string): string {
    // Parse the existing todolist
    const lines = existingTodolist.split('\n');
    
    // Extract section titles and tasks
    const sections: {[key: string]: string[]} = {};
    let currentSection = 'General';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check if this is a heading
      if (trimmedLine.startsWith('###')) {
        currentSection = trimmedLine.replace(/^###\s*/, '').trim();
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
      } 
      // Check if this is a task
      else if (trimmedLine.startsWith('- [ ]')) {
        const task = trimmedLine.replace(/^-\s*\[\s*\]\s*/, '').trim();
        if (task && !sections[currentSection]) {
          sections[currentSection] = [];
        }
        if (task) {
          sections[currentSection].push(task);
        }
      }
      // Add other lines as is
      else if (trimmedLine && !trimmedLine.startsWith('#')) {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push(line);
      }
    });
    
    // Start with the original todolist
    let enhancedTodolist = existingTodolist;
    
    // Only add enhancement sections if they don't already exist
    if (!enhancedTodolist.includes('## Enhancement Additions')) {
      enhancedTodolist += '\n\n## Enhancement Additions\n\n';
      
      // Add dynamic enhancements based on tasks found
      if (Object.keys(sections).some(section => 
        ['Frontend', 'UI', 'Interface'].some(keyword => 
          section.includes(keyword)
        )
      )) {
        enhancedTodolist += '### UI/UX Enhancement Specifications\n';
        enhancedTodolist += '- [ ] Define a consistent design system (colors, typography, spacing)\n';
        enhancedTodolist += '- [ ] Create responsive layouts for all screen sizes\n';
        enhancedTodolist += '- [ ] Implement accessibility standards (WCAG 2.1)\n';
        enhancedTodolist += '- [ ] Design loading states and error handling UI\n\n';
      }
      
      if (Object.keys(sections).some(section => 
        ['API', 'Backend', 'Server', 'Data'].some(keyword => 
          section.includes(keyword)
        )
      )) {
        enhancedTodolist += '### API & Data Layer Specifications\n';
        enhancedTodolist += '- [ ] Document API endpoints and request/response formats\n';
        enhancedTodolist += '- [ ] Implement proper error handling and status codes\n';
        enhancedTodolist += '- [ ] Design efficient data retrieval patterns\n';
        enhancedTodolist += '- [ ] Add validation for all inputs\n\n';
      }
      
      if (Object.keys(sections).some(section => 
        ['Auth', 'User', 'Login', 'Register'].some(keyword => 
          section.includes(keyword)
        )
      )) {
        enhancedTodolist += '### Authentication & Security Specifications\n';
        enhancedTodolist += '- [ ] Implement secure password storage\n';
        enhancedTodolist += '- [ ] Set up JWT or session-based authentication\n';
        enhancedTodolist += '- [ ] Add role-based access control\n';
        enhancedTodolist += '- [ ] Protect against common security vulnerabilities\n\n';
      }
      
      // Add standard sections that should be part of any project
      enhancedTodolist += '### Testing & Quality Assurance\n';
      enhancedTodolist += '- [ ] Write unit tests for core functionality\n';
      enhancedTodolist += '- [ ] Implement integration tests for key workflows\n';
      enhancedTodolist += '- [ ] Set up continuous integration pipeline\n';
      enhancedTodolist += '- [ ] Create test documentation\n\n';
      
      enhancedTodolist += '### Deployment & Operations\n';
      enhancedTodolist += '- [ ] Configure deployment environments\n';
      enhancedTodolist += '- [ ] Set up monitoring and logging\n';
      enhancedTodolist += '- [ ] Document operational procedures\n';
      enhancedTodolist += '- [ ] Plan for scaling and maintenance\n';
    }
    
    return enhancedTodolist;
  }

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
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the todolist
        const todolist = await fs.readFile(todolist_file, 'utf-8');
        
        // Check if there are any unchecked tasks
        const uncheckedTaskRegex = /- \[ \] (.+)$/m;
        if (!uncheckedTaskRegex.test(todolist)) {
          return `No unchecked tasks found in the todolist. All tasks appear to be completed.\n\nTodolist content:\n${todolist}`;
        }
        
        // Use LLM to find and prioritize the next task
        const nextTask = await findNextTaskWithLLM(todolist);
        return nextTask;
      } catch (error) {
        return handleError(error, 'Failed to find next task');
      }
    },
  });
  
  // LLM-based task prioritization
  async function findNextTaskWithLLM(todolist: string): Promise<string> {
    try {
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
      
      // Build Ollama parameters
      const ollamaParamsString = buildOllamaParamsString();
      
      // Run Ollama with parameters
      const { stdout } = await execAsync(`ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`);
      
      // Clean up the output
      let nextTask = stdout.trim();
      
      // Remove any markdown formatting the LLM might have included
      nextTask = nextTask.replace(/^- \[[ x]\]\s*/, '');
      
      // Verify the task exists in the todolist
      if (!todolist.includes(nextTask)) {
        // Fall back to simpler method if LLM output doesn't match a task
        console.warn('Warning: LLM suggested a task that does not exist in the todolist');
        const match = todolist.match(/- \[ \] (.+)$/m);
        nextTask = match ? match[1] : "No specific task identified";
      }
      
      return `Next task to implement: "${nextTask}"\n\nContext from todolist:\n${todolist}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: LLM task prioritization failed: ${errorMessage}, using simple fallback`);
      
      // Simple fallback: find first unchecked task
      const match = todolist.match(/- \[ \] (.+)$/m);
      const nextTask = match ? match[1] : "No specific task identified";
      
      return `Next task to implement: "${nextTask}"\n\nContext from todolist:\n${todolist}`;
    }
  }

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
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the todolist for context
        const todolist = await fs.readFile(todolist_file, 'utf-8');
        
        // Check if the task exists in the todolist
        if (!todolist.includes(task)) {
          return `Warning: The specified task "${task}" was not found in the todolist. This plan may lack proper context.\n\n` + createImplementationPlanFallback(task);
        }
        
        // Generate implementation plan with LLM
        const plan = await createImplementationPlanWithLLM(task, todolist);
        return plan;
      } catch (error) {
        return handleError(error, 'Failed to create implementation plan');
      }
    },
  });
  
  // LLM-based implementation planning
  async function createImplementationPlanWithLLM(task: string, todolistContext: string): Promise<string> {
    try {
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
      
      // Build Ollama parameters
      const ollamaParamsString = buildOllamaParamsString();
      
      // Run Ollama with parameters
      const { stdout } = await execAsync(`ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`);
      
      // Clean up the output
      let plan = stdout.trim();
      
      // If plan doesn't have a heading, add one
      if (!plan.startsWith('#')) {
        plan = `## Implementation Plan for: "${task}"\n\n${plan}`;
      }
      
      // If for some reason the LLM doesn't produce a good plan, use the fallback
      if (plan.length < 100) {
        console.warn('Warning: LLM generated a very short implementation plan, using fallback');
        return createImplementationPlanFallback(task);
      }
      
      return plan;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: LLM planning failed: ${errorMessage}, using fallback plan`);
      return createImplementationPlanFallback(task);
    }
  }

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

  // Add the new task_executor tool
  server.addTool({
    name: 'task_executor',
    description: 'Execute a planned task by implementing the necessary file operations based on the implementation plan.',
    parameters: z.object({
      task: z.string().describe('The task to implement'),
      todolist_file: z.string().describe('Path to the todolist file containing the task'),
      implementation_plan: z.string().optional().describe('Optional implementation plan for the task. If not provided, a plan will be generated.'),
      target_directory: z.string().optional().describe('Optional target directory for file operations. Defaults to current directory.'),
    }),
    execute: async (args) => {
      try {
        const { task, todolist_file, implementation_plan, target_directory = '.' } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Validate file exists
        if (!(await fileExists(todolist_file))) {
          return `Error: Todolist file "${todolist_file}" does not exist or is not accessible.`;
        }
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the todolist for context
        const todolist = await fs.readFile(todolist_file, 'utf-8');
        
        // If implementation plan not provided, generate one
        let executionPlan = implementation_plan;
        if (!executionPlan) {
          console.log(`Generating implementation plan for task: ${task}`);
          executionPlan = await createImplementationPlanWithLLM(task, todolist);
        }
        
        // Execute the implementation plan
        console.log(`Executing plan for task: ${task}`);
        const executionResult = await executeImplementationPlan(task, executionPlan, target_directory);
        
        // If execution was successful, mark task as complete
        if (executionResult.success) {
          // Create a regex to find the exact task
          const taskRegex = new RegExp(`- \\[ \\] ${task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
          const updatedTodolist = todolist.replace(taskRegex, `- [x] ${task}`);
          
          // Check if any replacements were made
          if (todolist !== updatedTodolist) {
            // Write the updated todolist
            await fs.writeFile(todolist_file, updatedTodolist, 'utf-8');
            
            return `Task "${task}" has been successfully implemented and marked as complete.\n\n` +
                   `Implementation Summary:\n${executionResult.summary}\n\n` +
                   `Updated todolist:\n${updatedTodolist}`;
          }
        }
        
        return `Task execution completed with ${executionResult.success ? 'success' : 'issues'}.\n\n` +
               `Implementation Summary:\n${executionResult.summary}`;
      } catch (error) {
        return handleError(error, 'Failed to execute task implementation');
      }
    },
  });
  
  // Implementation plan execution
  async function executeImplementationPlan(task: string, plan: string, targetDir: string): Promise<{success: boolean, summary: string}> {
    try {
      // Parse the implementation plan to extract actions
      const actions = await parsePlanIntoActions(plan, task);
      
      // Execute each action in sequence
      const executionResults = [];
      let allSuccessful = true;
      
      for (const action of actions) {
        console.log(`Executing action: ${action.type} - ${action.description}`);
        try {
          let result;
          
          switch (action.type) {
            case 'create_file':
              if (action.path && action.content) {
                const filePath = path.join(targetDir, action.path);
                const dir = path.dirname(filePath);
                
                // Ensure directory exists
                if (!existsSync(dir)) {
                  await fs.mkdir(dir, { recursive: true });
                }
                
                await fs.writeFile(filePath, action.content, 'utf-8');
                result = `Created file: ${filePath}`;
              } else {
                throw new Error('Missing path or content for create_file action');
              }
              break;
              
            case 'edit_file':
              if (action.path && action.changes) {
                const filePath = path.join(targetDir, action.path);
                
                // Check if file exists
                if (await fileExists(filePath)) {
                  const currentContent = await fs.readFile(filePath, 'utf-8');
                  let newContent = currentContent;
                  
                  // Apply each change
                  for (const change of action.changes) {
                    if (change.type === 'replace' && change.old && change.new) {
                      newContent = newContent.replace(change.old, change.new);
                    } else if (change.type === 'append' && change.content) {
                      newContent += change.content;
                    } else if (change.type === 'prepend' && change.content) {
                      newContent = change.content + newContent;
                    } else if (change.type === 'insert_at_line' && change.line !== undefined && change.content) {
                      const lines = newContent.split('\n');
                      if (change.line >= 0 && change.line <= lines.length) {
                        lines.splice(change.line, 0, change.content);
                        newContent = lines.join('\n');
                      }
                    }
                  }
                  
                  await fs.writeFile(filePath, newContent, 'utf-8');
                  result = `Updated file: ${filePath}`;
                } else {
                  throw new Error(`File not found: ${filePath}`);
                }
              } else {
                throw new Error('Missing path or changes for edit_file action');
              }
              break;
              
            case 'delete_file':
              if (action.path) {
                const filePath = path.join(targetDir, action.path);
                if (await fileExists(filePath)) {
                  await fs.unlink(filePath);
                  result = `Deleted file: ${filePath}`;
                } else {
                  result = `File not found, skipping deletion: ${filePath}`;
                }
              } else {
                throw new Error('Missing path for delete_file action');
              }
              break;
              
            default:
              result = `Unsupported action type: ${action.type}`;
              allSuccessful = false;
          }
          
          executionResults.push({ success: true, action, result });
        } catch (error) {
          executionResults.push({ success: false, action, error: error instanceof Error ? error.message : String(error) });
          allSuccessful = false;
        }
      }
      
      // Generate a summary of all actions
      const summary = executionResults.map(r => 
        r.success ? `✅ ${r.action.type}: ${r.result}` : `❌ ${r.action.type} failed: ${r.error}`
      ).join('\n');
      
      return { success: allSuccessful, summary };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        success: false, 
        summary: `Failed to execute implementation plan: ${errorMessage}`
      };
    }
  }
  
  // Helper function to parse the implementation plan into executable actions
  async function parsePlanIntoActions(plan: string, task: string): Promise<any[]> {
    try {
      // Use the LLM to parse the plan into structured actions
      const prompt = `
      You are a specialized AI that converts implementation plans into structured, executable actions.
      
      Given the following implementation plan for the task "${task}", extract a JSON array of execution steps
      that a task executor can follow to implement the changes. Each action should include:
      
      1. type: The action type (create_file, edit_file, delete_file)
      2. description: A brief description of what this action does
      3. Additional parameters based on the action type:
        - create_file: path, content
        - edit_file: path, changes (array of change objects with type, and parameters)
        - delete_file: path
      
      For edit_file actions, the changes can be:
        - replace: old (string to replace), new (replacement string)
        - append: content (string to append)
        - prepend: content (string to prepend)
        - insert_at_line: line (line number), content (string to insert)
      
      Implementation Plan:
      ${plan}
      
      Return ONLY a valid JSON array of actions, with no explanation or other text.
      `;
      
      // Build Ollama parameters
      const ollamaParamsString = buildOllamaParamsString();
      
      // Run Ollama with parameters
      const { stdout } = await execAsync(`ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`);
      
      // Extract JSON from the response
      const jsonMatch = stdout.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON actions from LLM response");
      }
      
      const actionsJson = jsonMatch[0];
      return JSON.parse(actionsJson);
    } catch (error) {
      console.error("Error parsing plan into actions:", error);
      // Return a minimal set of actions based on the plan without LLM parsing
      return [
        {
          type: 'create_file',
          description: `Implementation for task: ${task} (fallback action)`,
          path: `implementation_${task.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.md`,
          content: `# Implementation Plan for "${task}"\n\n${plan}\n\n> Note: This is a fallback implementation as the detailed action parsing failed.`
        }
      ];
    }
  }

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

/**
 * Helper function to create a fallback implementation plan
 */
function createImplementationPlanFallback(task: string): string {
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