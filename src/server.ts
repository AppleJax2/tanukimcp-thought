import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// Required model for the tool to function
const REQUIRED_MODEL = 'deepseek-r1';

/**
 * Project Context Manager for intelligent file operations
 */
class ProjectContextManager {
  private static instance: ProjectContextManager;
  private projectRegistry: Map<string, { path: string, metadata: any }> = new Map();
  private currentProject: string | null = null;
  private toolDirectories: Set<string> = new Set();
  
  private constructor() {
    // Initialize known tool directories
    this.toolDirectories.add(path.resolve(process.cwd()));
    this.toolDirectories.add(path.resolve(process.cwd(), 'tanukimcp-thought'));
  }
  
  public static getInstance(): ProjectContextManager {
    if (!ProjectContextManager.instance) {
      ProjectContextManager.instance = new ProjectContextManager();
    }
    return ProjectContextManager.instance;
  }
  
  /**
   * Detect if a path is within a tool directory rather than a user project
   */
  public isToolDirectory(dirPath: string): boolean {
    const normalized = path.resolve(dirPath);
    return Array.from(this.toolDirectories).some(toolDir => 
      normalized === toolDir || normalized.startsWith(toolDir + path.sep)
    );
  }
  
  /**
   * Create a proper project directory based on project name
   * Returns the full path to the created project directory
   */
  public createProjectDirectory(projectName: string): string {
    // Sanitize project name for directory creation
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Create projects directory in user's home directory
    const projectsDir = path.join(os.homedir(), 'projects');
    if (!existsSync(projectsDir)) {
      fs.mkdir(projectsDir, { recursive: true }).catch(err => console.error('Error creating projects directory:', err));
    }
    
    // Create the specific project directory
    const projectDir = path.join(projectsDir, sanitizedName);
    if (!existsSync(projectDir)) {
      fs.mkdir(projectDir, { recursive: true }).catch(err => console.error('Error creating project directory:', err));
    }
    
    // Register the project
    this.projectRegistry.set(projectName, { 
      path: projectDir,
      metadata: { created: new Date().toISOString() }
    });
    
    // Set as current project
    this.currentProject = projectName;
    
    return projectDir;
  }
  
  /**
   * Intelligently resolve a path based on project context
   */
  public resolvePath(workspaceRoot: string, targetPath: string, projectHint?: string): string {
    // Standard path resolution
    console.log('*** ProjectContextManager: Using standard path resolution ***');
    
    // If it's an absolute path, use it directly
    if (path.isAbsolute(targetPath)) {
      console.log(`*** Path is already absolute: ${targetPath} ***`);
      return targetPath;
    }
    
    // If workspace root is not absolute, this is an error
    if (!path.isAbsolute(workspaceRoot)) {
      throw new Error(`workspace_root must be an absolute path, got: ${workspaceRoot}`);
    }
    
    // Resolve the path relative to the workspace root
    const resolved = path.resolve(workspaceRoot, targetPath);
    console.log(`*** Resolved path: ${resolved} (from workspace_root: ${workspaceRoot}) ***`);
    
    return resolved;
  }
  
  /**
   * Set current project context
   */
  public setCurrentProject(projectName: string, projectPath: string): void {
    this.projectRegistry.set(projectName, { path: projectPath, metadata: {} });
    this.currentProject = projectName;
  }
}

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
  projectRoot?: string;  // Add project root path configuration
}

// Default configuration
const defaultConfig: Config = {
  llmModel: REQUIRED_MODEL,
  ollamaParams: {
    num_ctx: 16384,
    temperature: 0.7,
    top_p: 0.9,
    num_thread: 8
  },
  autoCreateConfig: true,
  projectRoot: process.cwd()  // Default to current working directory
};

// Load user config without any async operations during initialization
let userConfig: Config = defaultConfig;
try {
  if (existsSync('tanuki-config.json')) {
    const configContent = readFileSync('tanuki-config.json', 'utf-8');
    userConfig = JSON.parse(configContent);
  }
  // Note: We're not creating the config file here anymore - moved to a function that will be called during tool execution
} catch (error) {
  console.error('Error loading config:', error);
}

/**
 * Creates a default configuration file with optimized settings
 */
async function createDefaultConfigFile() {
  try {
    // Only create if it doesn't already exist (double-check to avoid race conditions)
    if (!existsSync('tanuki-config.json') && defaultConfig.autoCreateConfig) {
      const configContent = JSON.stringify({
        llmModel: defaultConfig.llmModel,
        ollamaParams: defaultConfig.ollamaParams,
        projectRoot: defaultConfig.projectRoot
      }, null, 2);
      
      await fs.writeFile('tanuki-config.json', configContent, 'utf-8');
      console.log('Created default configuration file: tanuki-config.json');
    }
  } catch (error) {
    console.error('Error creating default config file:', error);
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
      // Skip check in hosted environments
      if (process.env.SMITHERY_HOSTED === 'true') {
        console.log('Running in hosted environment, skipping Ollama check');
        throw new Error('Running in hosted environment, Ollama not available');
      }
      
      console.log('Checking for Ollama installation...');
      await execAsync('ollama --version');
      
      console.log(`Checking for ${REQUIRED_MODEL} model...`);
      const { stdout } = await execAsync('ollama list');
      
      if (!stdout.includes(REQUIRED_MODEL)) {
        throw new Error(`Required model "${REQUIRED_MODEL}" not found. Please run: ollama pull ${REQUIRED_MODEL}`);
      }
      
      // Only create config file at this point if needed
      if (defaultConfig.autoCreateConfig && !existsSync('tanuki-config.json')) {
        await createDefaultConfigFile();
      }
      
      console.log('✅ Ollama and required model verified!');
      return true;
    } catch (error) {
      // If in hosted environment, don't show error details
      if (process.env.SMITHERY_HOSTED === 'true') {
        console.log('Note: This tool requires Ollama to be installed locally for full functionality.');
        return false;
      }
      
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
  
  // Modified execute function with fallback for hosted environments
  async function executeWithOllamaOrFallback(command: string, fallbackFunction: Function): Promise<string> {
    try {
      // Try to use Ollama
      const ollamaAvailable = await ensureOllamaRequirements().catch(() => false);
      
      if (ollamaAvailable) {
        const { stdout } = await execAsync(command);
        return stdout;
      } else {
        // If Ollama not available and in hosted environment, use fallback
        console.log('Ollama not available, using fallback function');
        return await fallbackFunction();
      }
    } catch (error) {
      // If execution fails, also use fallback
      console.warn('Ollama execution failed, using fallback function');
      return await fallbackFunction();
    }
  }

  // Helper to extract client working directory from request headers
  function getClientWorkingDir(req: any): string | undefined {
    try {
      if (req && req.headers && req.headers['x-client-working-dir']) {
        const dirPath = req.headers['x-client-working-dir'] as string;
        console.log(`Received client working directory: ${dirPath}`);
        return dirPath;
      }
      return undefined;
    } catch (error) {
      console.error('Error extracting client working directory:', error);
      return undefined;
    }
  }

  // Phase 1: Brain Dump & Initial Organization
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
        
        // Generate a file name based on the project description if not provided
        // Sanitize the project name to create a valid filename
        const sanitizedProjectName = project_description
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 30); // Limit length
          
        const output_file = args.output_file || `${sanitizedProjectName}_todo.md`;
        
        // Validate inputs
        if (!project_description.trim()) {
          return 'Error: Project description cannot be empty.';
        }
        
        if (!unstructured_thoughts.trim()) {
          return 'Error: Unstructured thoughts cannot be empty.';
        }
        
        // Pass client working directory to resolveWorkspacePath
        const resolvedOutputPath = resolveWorkspacePath(workspace_root, output_file, project_description);
        
        // Check for file existence
        if (!overwrite && await fileExists(resolvedOutputPath)) {
          return `Error: File "${resolvedOutputPath}" already exists. Set overwrite=true to overwrite.`;
        }
        
        // Check if running in hosted environment
        if (process.env.SMITHERY_HOSTED === 'true') {
          // In hosted environments, provide a user-friendly message
          const todolist = generateTodoWithRules(project_description, unstructured_thoughts);
          
          // Still write the todolist to file so it can be used in subsequent steps
          try {
            // Ensure the output directory exists
            const dir = path.dirname(resolvedOutputPath);
            if (!existsSync(dir)) {
              await fs.mkdir(dir, { recursive: true });
            }
            
            await fs.writeFile(resolvedOutputPath, todolist, 'utf-8');
          } catch (fileError) {
            console.warn('Could not write todolist to file in hosted environment:', fileError);
          }
          
          // Add guidance for LLMs on workspace_root
          return `Note: In hosted environments, this tool uses rule-based processing instead of LLM. For full functionality, use locally with Ollama installed.\n\n${todolist}${getLLMWorkspaceGuidance()}`;
        }
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // Use rule-based fallback if Ollama not available
          const todolist = generateTodoWithRules(project_description, unstructured_thoughts);
          
          // Ensure the output directory exists
          const dir = path.dirname(resolvedOutputPath);
          if (!existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
          }
          
          // Write the todolist to file
          await fs.writeFile(resolvedOutputPath, todolist, 'utf-8');
          
          return `This tool requires Ollama and the deepseek-r1 model to be installed locally. Using rule-based fallback.\n\n${todolist}`;
        }
        
        // Generate todolist with LLM
        const todolist = await generateTodoWithLLM(project_description, unstructured_thoughts);
        
        // Ensure the output directory exists
        const dir = path.dirname(resolvedOutputPath);
        if (!existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        
        // Write the todolist to file
        await fs.writeFile(resolvedOutputPath, todolist, 'utf-8');
        
        // Set current project context after successful file creation
        ProjectContextManager.getInstance().setCurrentProject(
          project_description,
          path.dirname(resolvedOutputPath)
        );
        
        // Add guidance for LLMs on workspace_root
        const response = `Successfully created todolist and saved to "${resolvedOutputPath}".\n\n${todolist}${getLLMWorkspaceGuidance()}`;
        
        return response;
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
      
      // Use the new function with fallback
      const stdout = await executeWithOllamaOrFallback(
        `ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`,
        () => Promise.resolve(generateTodoWithRules(projectDescription, thoughts))
      );
      
      // Clean up the output to ensure it's valid markdown
      let output = stdout.trim();
      
      // If the output doesn't start with a markdown heading, add one
      if (!output.startsWith('# ')) {
        output = `# ${projectDescription}\n\n${output}`;
      }
      
      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`LLM generation failed: ${errorMessage}, using rule-based fallback`);
      return generateTodoWithRules(projectDescription, thoughts);
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
    description: 'Enhance an existing todolist with more detailed specifications, acceptance criteria, and technical requirements. Will not overwrite existing files unless overwrite=true.',
    parameters: z.object({
      input_file: z.string().describe('Path to the existing todolist file'),
      output_file: z.string().optional().describe('Optional file path to save the enhanced todolist (defaults to overwriting input file)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if file exists (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { input_file, output_file, overwrite = false, workspace_root } = args;
        
        // Resolve the input and output file paths relative to the workspace root
        const resolvedInputPath = resolveWorkspacePath(workspace_root, input_file);
        const resolvedOutputPath = output_file ? resolveWorkspacePath(workspace_root, output_file) : resolvedInputPath;
        
        // Validate file exists
        if (!(await fileExists(resolvedInputPath))) {
          return `Error: Input file "${resolvedInputPath}" does not exist or is not accessible.`;
        }
        // Check for file existence if output_file exists and is not input_file, or if overwriting input_file
        if (!overwrite && resolvedOutputPath !== resolvedInputPath && await fileExists(resolvedOutputPath)) {
          return `Error: Output file "${resolvedOutputPath}" already exists. Set overwrite=true to overwrite.`;
        }
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the existing todolist
        const existingTodolist = await fs.readFile(resolvedInputPath, 'utf-8');
        
        // Generate enhanced todolist with LLM
        const enhancedTodolist = await enhanceTodoWithLLM(existingTodolist);
        
        // Ensure the output directory exists
        const dir = path.dirname(resolvedOutputPath);
        if (!existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        
        // Write the enhanced todolist to file
        await fs.writeFile(resolvedOutputPath, enhancedTodolist, 'utf-8');
        
        return `Successfully enhanced todolist and saved to "${resolvedOutputPath}".\n\n${enhancedTodolist}${getLLMWorkspaceGuidance()}`;
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
      
      // Use the new function with fallback
      const stdout = await executeWithOllamaOrFallback(
        `ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`,
        () => Promise.resolve(enhanceTodoWithRules(existingTodolist))
      );
      
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
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { todolist_file, workspace_root } = args;
        
        // Resolve the todolist file path relative to the workspace root
        const resolvedTodolistPath = resolveWorkspacePath(workspace_root, todolist_file);
        
        // Validate file exists
        if (!(await fileExists(resolvedTodolistPath))) {
          return `Error: Todolist file "${resolvedTodolistPath}" does not exist or is not accessible.`;
        }
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the todolist
        const todolist = await fs.readFile(resolvedTodolistPath, 'utf-8');
        
        // Check if there are any unchecked tasks
        const uncheckedTaskRegex = /- \[ \] (.+)$/m;
        if (!uncheckedTaskRegex.test(todolist)) {
          return `No unchecked tasks found in the todolist. All tasks appear to be completed.\n\nTodolist content:\n${todolist}`;
        }
        
        // Use LLM to find and prioritize the next task
        const nextTask = await findNextTaskWithLLM(todolist);
        return `Next task to implement: "${nextTask}"\n\nContext from todolist:\n${todolist}${getLLMWorkspaceGuidance()}`;
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
      
      // Fallback function to find first unchecked task
      const findFirstUncheckedTask = () => {
        const match = todolist.match(/- \[ \] (.+)$/m);
        const nextTask = match ? match[1] : "No specific task identified";
        return Promise.resolve(nextTask);
      };
      
      // Use the new function with fallback
      const stdout = await executeWithOllamaOrFallback(
        `ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`,
        findFirstUncheckedTask
      );
      
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
      
      return nextTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: LLM task prioritization failed: ${errorMessage}, using simple fallback`);
      
      // Simple fallback: find first unchecked task
      const match = todolist.match(/- \[ \] (.+)$/m);
      const nextTask = match ? match[1] : "No specific task identified";
      
      return nextTask;
    }
  }

  // Phase 3: Sequential Task Implementation - Plan Task
  server.addTool({
    name: 'plan_task_implementation',
    description: 'Create a detailed implementation plan for a specific task.',
    parameters: z.object({
      task: z.string().describe('The task to implement (exact text from todolist)'),
      todolist_file: z.string().describe('Path to the todolist file'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { task, todolist_file, workspace_root } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Resolve the todolist file path relative to the workspace root
        const resolvedTodolistPath = resolveWorkspacePath(workspace_root, todolist_file);
        
        // Validate file exists
        if (!(await fileExists(resolvedTodolistPath))) {
          return `Error: Todolist file "${resolvedTodolistPath}" does not exist or is not accessible.`;
        }
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the todolist for context
        const todolist = await fs.readFile(resolvedTodolistPath, 'utf-8');
        
        // Check if the task exists in the todolist
        if (!todolist.includes(task)) {
          return `Warning: The specified task "${task}" was not found in the todolist. This plan may lack proper context.\n\n` + createImplementationPlanFallback(task);
        }
        
        // Generate implementation plan with LLM
        const plan = await createImplementationPlanWithLLM(task, todolist);
        return plan + getLLMWorkspaceGuidance();
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
      
      // Use the new function with fallback
      const stdout = await executeWithOllamaOrFallback(
        `ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`,
        () => Promise.resolve(createImplementationPlanFallback(task))
      );
      
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
      task: z.string().describe('The task to mark as complete (exact text from todolist)'),
      todolist_file: z.string().describe('Path to the todolist file'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { task, todolist_file, workspace_root } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Resolve the todolist file path relative to the workspace root
        const resolvedTodolistPath = resolveWorkspacePath(workspace_root, todolist_file);
        
        // Validate file exists
        if (!(await fileExists(resolvedTodolistPath))) {
          return `Error: Todolist file "${resolvedTodolistPath}" does not exist or is not accessible.`;
        }
        
        // Read the todolist
        const todolist = await fs.readFile(resolvedTodolistPath, 'utf-8');
        
        // Create a regex to find the exact task
        const taskRegex = new RegExp(`- \\[ \\] ${task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        const updatedTodolist = todolist.replace(taskRegex, `- [x] ${task}`);
        
        // Check if any replacements were made
        if (todolist === updatedTodolist) {
          return `Task "${task}" was not found in the todolist as an unchecked task. It might be already completed or might not exist exactly as specified.`;
        }
        
        // Write the updated todolist
        await fs.writeFile(resolvedTodolistPath, updatedTodolist, 'utf-8');
        
        return `Successfully marked task "${task}" as complete.\n\nUpdated todolist:\n${updatedTodolist}${getLLMWorkspaceGuidance()}`;
      } catch (error) {
        return handleError(error, 'Failed to mark task as complete');
      }
    },
  });

  // Add the new task_executor tool
  server.addTool({
    name: 'task_executor',
    description: 'Execute a planned task by implementing the necessary file operations based on the implementation plan. Use validate_plan=true to preview actions without executing them.',
    parameters: z.object({
      task: z.string().describe('The task to implement'),
      todolist_file: z.string().describe('Path to the todolist file containing the task'),
      implementation_plan: z.string().optional().describe('Optional implementation plan for the task. If not provided, a plan will be generated.'),
      target_directory: z.string().optional().describe('Optional target directory for file operations. Defaults to current directory.'),
      validate_plan: z.boolean().optional().describe('Whether to only validate and preview the plan without executing it (default: false)'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { task, todolist_file, implementation_plan, target_directory = '.', validate_plan = false, workspace_root } = args;
        
        // Validate inputs
        if (!task.trim()) {
          return 'Error: Task description cannot be empty.';
        }
        
        // Resolve the todolist file path and target directory relative to the workspace root
        const resolvedTodolistPath = resolveWorkspacePath(workspace_root, todolist_file);
        const resolvedTargetDirectory = resolveWorkspacePath(workspace_root, target_directory);
        
        // Validate todolist file exists
        if (!(await fileExists(resolvedTodolistPath))) {
          return `Error: Todolist file "${resolvedTodolistPath}" does not exist or is not accessible.`;
        }
        
        // Check Ollama requirements only when the tool is called
        try {
          await ensureOllamaRequirements();
        } catch (error) {
          // In hosted environments, provide a more user-friendly error
          return 'This tool requires Ollama and the deepseek-r1 model to be installed locally. Please see the installation instructions in the README.';
        }
        
        // Read the todolist for context
        const todolist = await fs.readFile(resolvedTodolistPath, 'utf-8');
        
        // If implementation plan not provided, generate one
        let executionPlan = implementation_plan;
        if (!executionPlan) {
          console.log(`Generating implementation plan for task: ${task}`);
          executionPlan = await createImplementationPlanWithLLM(task, todolist);
        }
        
        // Parse the implementation plan into actions for validation/preview
        const actions = await parsePlanIntoActions(executionPlan, task);
        
        // If validate_plan is true, preview the actions without executing them
        if (validate_plan) {
          // Generate a detailed preview of each action
          const actionPreviews = [];
          
          for (const action of actions) {
            switch (action.type) {
              case 'create_file':
                if (action.path && action.content) {
                  const filePath = path.join(resolvedTargetDirectory, action.path);
                  const fileExists = existsSync(filePath);
                  actionPreviews.push(`CREATE FILE: ${filePath}${fileExists ? ' (exists, will be overwritten)' : ''}\n` +
                    `Content length: ${action.content.length} characters\n` +
                    `Preview: ${action.content.slice(0, 100)}${action.content.length > 100 ? '...' : ''}`);
                } else {
                  actionPreviews.push(`CREATE FILE: Invalid action - missing path or content`);
                }
                break;
                
              case 'edit_file':
                if (action.path && action.changes) {
                  const filePath = path.join(resolvedTargetDirectory, action.path);
                  const fileExists = existsSync(filePath);
                  if (fileExists) {
                    const changes = action.changes.map((c: any) => {
                      if (c.type === 'replace') return `Replace "${c.old?.slice(0, 30)}${c.old?.length > 30 ? '...' : ''}" with "${c.new?.slice(0, 30)}${c.new?.length > 30 ? '...' : ''}"`;
                      if (c.type === 'append') return `Append ${c.content?.length} characters`;
                      if (c.type === 'prepend') return `Prepend ${c.content?.length} characters`;
                      if (c.type === 'insert_at_line') return `Insert at line ${c.line}: "${c.content?.slice(0, 30)}${c.content?.length > 30 ? '...' : ''}"`;
                      return `Unknown change type: ${c.type}`;
                    }).join('\n  - ');
                    
                    actionPreviews.push(`EDIT FILE: ${filePath}\nChanges:\n  - ${changes}`);
                  } else {
                    actionPreviews.push(`EDIT FILE: ${filePath} (does not exist, operation will fail)`);
                  }
                } else {
                  actionPreviews.push(`EDIT FILE: Invalid action - missing path or changes`);
                }
                break;
                
              case 'delete_file':
                if (action.path) {
                  const filePath = path.join(resolvedTargetDirectory, action.path);
                  const fileExists = existsSync(filePath);
                  actionPreviews.push(`DELETE FILE: ${filePath}${fileExists ? '' : ' (does not exist, operation will fail)'}`);
                } else {
                  actionPreviews.push(`DELETE FILE: Invalid action - missing path`);
                }
                break;
                
              case 'move_file':
                if (action.from && action.to) {
                  const fromPath = path.join(resolvedTargetDirectory, action.from);
                  const toPath = path.join(resolvedTargetDirectory, action.to);
                  const fromExists = existsSync(fromPath);
                  const toExists = existsSync(toPath);
                  
                  actionPreviews.push(`MOVE FILE: ${fromPath} -> ${toPath}\n` +
                    `Source ${fromExists ? 'exists' : 'does not exist (operation will fail)'}\n` +
                    `Destination ${toExists ? 'exists (will be overwritten)' : 'does not exist'}`);
                } else {
                  actionPreviews.push(`MOVE FILE: Invalid action - missing from or to paths`);
                }
                break;
                
              case 'copy_file':
                if (action.from && action.to) {
                  const fromPath = path.join(resolvedTargetDirectory, action.from);
                  const toPath = path.join(resolvedTargetDirectory, action.to);
                  const fromExists = existsSync(fromPath);
                  const toExists = existsSync(toPath);
                  
                  actionPreviews.push(`COPY FILE: ${fromPath} -> ${toPath}\n` +
                    `Source ${fromExists ? 'exists' : 'does not exist (operation will fail)'}\n` +
                    `Destination ${toExists ? 'exists (will be overwritten)' : 'does not exist'}`);
                } else {
                  actionPreviews.push(`COPY FILE: Invalid action - missing from or to paths`);
                }
                break;
                
              default:
                actionPreviews.push(`Unknown action type: ${action.type}`);
            }
          }
          
          return `Plan validation for task "${task}":\n\n` +
                 `This plan would perform ${actions.length} operations in "${resolvedTargetDirectory}":\n\n` +
                 actionPreviews.join('\n\n') + 
                 '\n\nTo execute this plan, run again without validate_plan=true or with validate_plan=false.';
        }
        
        // Execute the implementation plan
        console.log(`Executing plan for task: ${task}`);
        const executionResult = await executeImplementationPlan(task, executionPlan, resolvedTargetDirectory);
        
        // If execution was successful, mark task as complete
        if (executionResult.success) {
          // Create a regex to find the exact task
          const taskRegex = new RegExp(`- \\[ \\] ${task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
          const updatedTodolist = todolist.replace(taskRegex, `- [x] ${task}`);
          
          // Check if any replacements were made
          if (todolist !== updatedTodolist) {
            // Write the updated todolist
            await fs.writeFile(resolvedTodolistPath, updatedTodolist, 'utf-8');
            
            return `Task "${task}" has been successfully implemented and marked as complete.\n\n` +
                   `Implementation Summary:\n${executionResult.summary}\n\n` +
                   `Updated todolist:\n${updatedTodolist}${getLLMWorkspaceGuidance()}`;
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
      
      // Fallback function to create minimal action set
      const createMinimalActionSet = () => {
        const sanitizedTaskName = task
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 30);
          
        return Promise.resolve(JSON.stringify([
          {
            type: 'create_file',
            description: `Implementation for task: ${task} (fallback action)`,
            path: `implementation_${sanitizedTaskName}.md`,
            content: `# Implementation Plan for "${task}"\n\n${plan}\n\n> Note: This is a fallback implementation as the detailed action parsing failed.`
          }
        ]));
      };
      
      // Use the new function with fallback
      const stdout = await executeWithOllamaOrFallback(
        `ollama run ${userConfig.llmModel} ${ollamaParamsString} "${prompt.replace(/"/g, '\\"')}"`,
        createMinimalActionSet
      );
      
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
      const sanitizedTaskName = task
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 30);
      
      return [
        {
          type: 'create_file',
          description: `Implementation for task: ${task} (fallback action)`,
          path: `implementation_${sanitizedTaskName}.md`,
          content: `# Implementation Plan for "${task}"\n\n${plan}\n\n> Note: This is a fallback implementation as the detailed action parsing failed.`
        }
      ];
    }
  }

  // Helper to resolve and validate paths within workspace
  function resolveWorkspacePath(workspaceRoot: string, targetPath: string, projectHint?: string): string {
    // Require an explicit workspace root - no more special handling for "."
    if (!workspaceRoot || workspaceRoot === '.') {
      throw new Error('ERROR: workspace_root parameter is required and must be an absolute path. The AI assistant needs to provide the user\'s current working directory.');
    }
    
    // Use the ProjectContextManager for path resolution, but always with the explicit workspace root
    return ProjectContextManager.getInstance().resolvePath(workspaceRoot, targetPath, projectHint);
  }

  // CREATE FILE
  server.addTool({
    name: 'create_file',
    description: 'Create a new file with the specified content in the workspace.',
    parameters: z.object({
      path: z.string().describe('Relative path to the file to create'),
      content: z.string().describe('Content to write to the file'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if file exists (default: false)'),
    }),
    execute: async (args) => {
      try {
        const { path: relPath, content, workspace_root, overwrite = false } = args;
        const filePath = resolveWorkspacePath(workspace_root, relPath);
        const dir = path.dirname(filePath);
        if (!existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        if (!overwrite && await fileExists(filePath)) {
          return `Error: File already exists at ${filePath}. Set overwrite=true to overwrite.`;
        }
        await fs.writeFile(filePath, content, 'utf-8');
        return `File created at ${filePath}`;
      } catch (error) {
        return handleError(error, 'Failed to create file');
      }
    },
  });

  // EDIT FILE
  server.addTool({
    name: 'edit_file',
    description: 'Edit an existing file by applying changes (replace, append, prepend, insert_at_line).',
    parameters: z.object({
      path: z.string().describe('Relative path to the file to edit'),
      changes: z.array(z.object({
        type: z.enum(['replace', 'append', 'prepend', 'insert_at_line']),
        old: z.string().optional(),
        new: z.string().optional(),
        content: z.string().optional(),
        line: z.number().optional(),
      })).describe('Array of changes to apply'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { path: relPath, changes, workspace_root } = args;
        const filePath = resolveWorkspacePath(workspace_root, relPath);
        if (!await fileExists(filePath)) {
          return `Error: File not found: ${filePath}`;
        }
        let content = await fs.readFile(filePath, 'utf-8');
        for (const change of changes) {
          if (change.type === 'replace' && change.old && change.new) {
            content = content.replace(change.old, change.new);
          } else if (change.type === 'append' && change.content) {
            content += change.content;
          } else if (change.type === 'prepend' && change.content) {
            content = change.content + content;
          } else if (change.type === 'insert_at_line' && change.line !== undefined && change.content) {
            const lines = content.split('\n');
            if (change.line >= 0 && change.line <= lines.length) {
              lines.splice(change.line, 0, change.content);
              content = lines.join('\n');
            }
          }
        }
        await fs.writeFile(filePath, content, 'utf-8');
        return `File edited at ${filePath}`;
      } catch (error) {
        return handleError(error, 'Failed to edit file');
      }
    },
  });

  // DELETE FILE
  server.addTool({
    name: 'delete_file',
    description: 'Delete a file from the workspace.',
    parameters: z.object({
      path: z.string().describe('Relative path to the file to delete'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
    }),
    execute: async (args) => {
      try {
        const { path: relPath, workspace_root } = args;
        const filePath = resolveWorkspacePath(workspace_root, relPath);
        if (!await fileExists(filePath)) {
          return `File not found: ${filePath}`;
        }
        await fs.unlink(filePath);
        return `File deleted: ${filePath}`;
      } catch (error) {
        return handleError(error, 'Failed to delete file');
      }
    },
  });

  // MOVE FILE
  server.addTool({
    name: 'move_file',
    description: 'Move a file from one location to another within the workspace.',
    parameters: z.object({
      from: z.string().describe('Relative path to the source file'),
      to: z.string().describe('Relative path to the destination'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if destination exists (default: false)'),
    }),
    execute: async (args) => {
      try {
        const { from, to, workspace_root, overwrite = false } = args;
        const fromPath = resolveWorkspacePath(workspace_root, from);
        const toPath = resolveWorkspacePath(workspace_root, to);
        if (!await fileExists(fromPath)) {
          return `Source file not found: ${fromPath}`;
        }
        if (!overwrite && await fileExists(toPath)) {
          return `Destination file already exists: ${toPath}. Set overwrite=true to overwrite.`;
        }
        const toDir = path.dirname(toPath);
        if (!existsSync(toDir)) {
          await fs.mkdir(toDir, { recursive: true });
        }
        await fs.rename(fromPath, toPath);
        return `File moved from ${fromPath} to ${toPath}`;
      } catch (error) {
        return handleError(error, 'Failed to move file');
      }
    },
  });

  // COPY FILE
  server.addTool({
    name: 'copy_file',
    description: 'Copy a file from one location to another within the workspace.',
    parameters: z.object({
      from: z.string().describe('Relative path to the source file'),
      to: z.string().describe('Relative path to the destination'),
      workspace_root: z.string().optional().describe('Workspace root directory (default: ".")'),
      overwrite: z.boolean().optional().describe('Whether to overwrite if destination exists (default: false)'),
    }),
    execute: async (args) => {
      try {
        const { from, to, workspace_root = '.', overwrite = false } = args;
        const fromPath = resolveWorkspacePath(workspace_root, from);
        const toPath = resolveWorkspacePath(workspace_root, to);
        if (!await fileExists(fromPath)) {
          return `Source file not found: ${fromPath}`;
        }
        if (!overwrite && await fileExists(toPath)) {
          return `Destination file already exists: ${toPath}. Set overwrite=true to overwrite.`;
        }
        const toDir = path.dirname(toPath);
        if (!existsSync(toDir)) {
          await fs.mkdir(toDir, { recursive: true });
        }
        await fs.copyFile(fromPath, toPath);
        return `File copied from ${fromPath} to ${toPath}`;
      } catch (error) {
        return handleError(error, 'Failed to copy file');
      }
    },
  });

  // CREATE DIRECTORY
  server.addTool({
    name: 'create_directory',
    description: 'Create a new directory in the workspace.',
    parameters: z.object({
      path: z.string().describe('Relative path to the directory to create'),
      workspace_root: z.string().optional().describe('Workspace root directory (default: ".")'),
      recursive: z.boolean().optional().describe('Whether to create parent directories if they do not exist (default: true)'),
    }),
    execute: async (args) => {
      try {
        const { path: relPath, workspace_root = '.', recursive = true } = args;
        const dirPath = resolveWorkspacePath(workspace_root, relPath);
        
        if (existsSync(dirPath)) {
          return `Directory already exists at ${dirPath}`;
        }
        
        await fs.mkdir(dirPath, { recursive });
        return `Directory created at ${dirPath}`;
      } catch (error) {
        return handleError(error, 'Failed to create directory');
      }
    },
  });

  // LIST DIRECTORY
  server.addTool({
    name: 'list_directory',
    description: 'List the contents of a directory in the workspace.',
    parameters: z.object({
      path: z.string().describe('Relative path to the directory to list'),
      workspace_root: z.string().optional().describe('Workspace root directory (default: ".")'),
      include_hidden: z.boolean().optional().describe('Whether to include hidden files (default: false)'),
    }),
    execute: async (args) => {
      try {
        const { path: relPath, workspace_root = '.', include_hidden = false } = args;
        const dirPath = resolveWorkspacePath(workspace_root, relPath);
        
        if (!existsSync(dirPath)) {
          return `Directory not found: ${dirPath}`;
        }
        
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = [];
        const directories = [];
        
        for (const entry of entries) {
          // Skip hidden files/directories unless include_hidden is true
          if (!include_hidden && entry.name.startsWith('.')) {
            continue;
          }
          
          if (entry.isDirectory()) {
            directories.push(`[dir] ${entry.name}/`);
          } else {
            // Get file size if it's a file
            const stats = await fs.stat(path.join(dirPath, entry.name));
            const size = stats.size;
            const sizeStr = size < 1024 ? `${size}B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)}KB` : `${(size / (1024 * 1024)).toFixed(1)}MB`;
            files.push(`[file] ${entry.name} (${sizeStr})`);
          }
        }
        
        // Sort and combine
        directories.sort();
        files.sort();
        const listing = [...directories, ...files].join('\n');
        
        return `Contents of ${dirPath}:\n\n${listing || 'Empty directory'}`;
      } catch (error) {
        return handleError(error, 'Failed to list directory');
      }
    },
  });

  // DELETE DIRECTORY
  server.addTool({
    name: 'delete_directory',
    description: 'Delete a directory from the workspace.',
    parameters: z.object({
      path: z.string().describe('Relative path to the directory to delete'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
      recursive: z.boolean().optional().describe('Whether to recursively delete contents (default: false)'),
      dry_run: z.boolean().optional().describe('Preview the operation without making changes (default: false)'),
    }),
    execute: async (args) => {
      try {
        const { path: relPath, workspace_root, recursive = false, dry_run = false } = args;
        const dirPath = resolveWorkspacePath(workspace_root, relPath);
        
        if (!existsSync(dirPath)) {
          return `Directory not found: ${dirPath}`;
        }
        
        // Get contents for preview or to check if directory is empty
        const entries = await fs.readdir(dirPath);
        
        // Preview mode
        if (dry_run) {
          if (entries.length > 0 && !recursive) {
            return `DRY RUN: Would fail to delete non-empty directory ${dirPath}. Use recursive=true to delete with contents.`;
          }
          return `DRY RUN: Would delete directory ${dirPath}${recursive ? ' and all its contents' : ''}`;
        }
        
        // Non-recursive delete requires directory to be empty
        if (entries.length > 0 && !recursive) {
          return `Error: Directory is not empty: ${dirPath}. Use recursive=true to delete non-empty directories.`;
        }
        
        // Perform the delete operation
        if (recursive) {
          await fs.rm(dirPath, { recursive: true, force: true });
        } else {
          await fs.rmdir(dirPath);
        }
        
        return `Directory deleted: ${dirPath}${recursive ? ' (including all contents)' : ''}`;
      } catch (error) {
        return handleError(error, 'Failed to delete directory');
      }
    },
  });

  // BATCH OPERATIONS
  server.addTool({
    name: 'batch_operations',
    description: 'Execute multiple file/directory operations in a single batch.',
    parameters: z.object({
      operations: z.array(
        z.object({
          type: z.enum(['create_file', 'edit_file', 'delete_file', 'move_file', 'copy_file', 'create_directory', 'delete_directory']),
          params: z.record(z.any()).describe('Parameters for the operation, matching the parameters of the individual tool'),
        })
      ).describe('Array of operations to perform'),
      workspace_root: z.string().describe('Workspace root directory (absolute path to the user\'s working directory)'),
      dry_run: z.boolean().optional().describe('Preview all operations without making changes (default: false)'),
      continue_on_error: z.boolean().optional().describe('Whether to continue executing operations after an error (default: false)'),
    }),
    execute: async (args) => {
      try {
        const { operations, workspace_root, dry_run = false, continue_on_error = false } = args;
        const results = [];
        let success = true;
        
        for (const [index, operation] of operations.entries()) {
          try {
            // Apply workspace_root from batch to operation if not specified
            const params = {
              ...operation.params,
              workspace_root: operation.params.workspace_root || workspace_root,
              dry_run: dry_run || operation.params.dry_run,
            };
            
            // Type assertion for params to avoid TypeScript errors
            const typedParams = params as Record<string, any>;
            
            let result;
            switch (operation.type) {
              case 'create_file':
                // Execute create_file directly
                if (typedParams.path && typedParams.content) {
                  const filePath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.path);
                  const dir = path.dirname(filePath);
                  
                  if (typedParams.dry_run) {
                    result = `DRY RUN: Would create file at ${filePath}`;
                  } else {
                    // Ensure directory exists
                    if (!existsSync(dir)) {
                      await fs.mkdir(dir, { recursive: true });
                    }
                    
                    // Check for file existence and overwrite flag
                    if (!typedParams.overwrite && existsSync(filePath)) {
                      result = `Error: File already exists at ${filePath}. Set overwrite=true to overwrite.`;
                    } else {
                      await fs.writeFile(filePath, typedParams.content, 'utf-8');
                      result = `File created at ${filePath}`;
                    }
                  }
                } else {
                  result = 'Error: Missing required parameters (path, content) for create_file operation';
                  success = false;
                }
                break;
                
              case 'edit_file':
                // Execute edit_file directly
                if (typedParams.path && typedParams.changes) {
                  const filePath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.path);
                  
                  if (typedParams.dry_run) {
                    result = `DRY RUN: Would edit file at ${filePath}`;
                  } else {
                    // Check if file exists
                    if (!existsSync(filePath)) {
                      result = `Error: File not found: ${filePath}`;
                      success = false;
                    } else {
                      const currentContent = await fs.readFile(filePath, 'utf-8');
                      let newContent = currentContent;
                      
                      // Apply each change
                      for (const change of typedParams.changes) {
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
                      result = `File edited at ${filePath}`;
                    }
                  }
                } else {
                  result = 'Error: Missing required parameters (path, changes) for edit_file operation';
                  success = false;
                }
                break;
                
              case 'delete_file':
                // Execute delete_file directly
                if (typedParams.path) {
                  const filePath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.path);
                  
                  if (typedParams.dry_run) {
                    result = `DRY RUN: Would delete file at ${filePath}`;
                  } else {
                    if (!existsSync(filePath)) {
                      result = `File not found: ${filePath}`;
                    } else {
                      await fs.unlink(filePath);
                      result = `File deleted: ${filePath}`;
                    }
                  }
                } else {
                  result = 'Error: Missing required parameter (path) for delete_file operation';
                  success = false;
                }
                break;
                
              case 'move_file':
                // Execute move_file directly
                if (typedParams.from && typedParams.to) {
                  const fromPath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.from);
                  const toPath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.to);
                  
                  if (typedParams.dry_run) {
                    result = `DRY RUN: Would move file from ${fromPath} to ${toPath}`;
                  } else {
                    if (!existsSync(fromPath)) {
                      result = `Source file not found: ${fromPath}`;
                      success = false;
                    } else if (!typedParams.overwrite && existsSync(toPath)) {
                      result = `Destination file already exists: ${toPath}. Set overwrite=true to overwrite.`;
                      success = false;
                    } else {
                      const toDir = path.dirname(toPath);
                      if (!existsSync(toDir)) {
                        await fs.mkdir(toDir, { recursive: true });
                      }
                      
                      await fs.rename(fromPath, toPath);
                      result = `File moved from ${fromPath} to ${toPath}`;
                    }
                  }
                } else {
                  result = 'Error: Missing required parameters (from, to) for move_file operation';
                  success = false;
                }
                break;
                
              case 'copy_file':
                // Execute copy_file directly
                if (typedParams.from && typedParams.to) {
                  const fromPath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.from);
                  const toPath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.to);
                  
                  if (typedParams.dry_run) {
                    result = `DRY RUN: Would copy file from ${fromPath} to ${toPath}`;
                  } else {
                    if (!existsSync(fromPath)) {
                      result = `Source file not found: ${fromPath}`;
                      success = false;
                    } else if (!typedParams.overwrite && existsSync(toPath)) {
                      result = `Destination file already exists: ${toPath}. Set overwrite=true to overwrite.`;
                      success = false;
                    } else {
                      const toDir = path.dirname(toPath);
                      if (!existsSync(toDir)) {
                        await fs.mkdir(toDir, { recursive: true });
                      }
                      
                      await fs.copyFile(fromPath, toPath);
                      result = `File copied from ${fromPath} to ${toPath}`;
                    }
                  }
                } else {
                  result = 'Error: Missing required parameters (from, to) for copy_file operation';
                  success = false;
                }
                break;
                
              case 'create_directory':
                // Execute create_directory directly
                if (typedParams.path) {
                  const dirPath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.path);
                  
                  if (typedParams.dry_run) {
                    result = `DRY RUN: Would create directory at ${dirPath}`;
                  } else {
                    if (existsSync(dirPath)) {
                      result = `Directory already exists at ${dirPath}`;
                    } else {
                      await fs.mkdir(dirPath, { recursive: typedParams.recursive !== false });
                      result = `Directory created at ${dirPath}`;
                    }
                  }
                } else {
                  result = 'Error: Missing required parameter (path) for create_directory operation';
                  success = false;
                }
                break;
                
              case 'delete_directory':
                // Execute delete_directory directly
                if (typedParams.path) {
                  const dirPath = resolveWorkspacePath(typedParams.workspace_root || '.', typedParams.path);
                  
                  if (typedParams.dry_run) {
                    const entries = existsSync(dirPath) ? await fs.readdir(dirPath) : [];
                    if (entries.length > 0 && !typedParams.recursive) {
                      result = `DRY RUN: Would fail to delete non-empty directory ${dirPath}. Use recursive=true to delete with contents.`;
                    } else {
                      result = `DRY RUN: Would delete directory ${dirPath}${typedParams.recursive ? ' and all its contents' : ''}`;
                    }
                  } else {
                    if (!existsSync(dirPath)) {
                      result = `Directory not found: ${dirPath}`;
                    } else {
                      const entries = await fs.readdir(dirPath);
                      if (entries.length > 0 && !typedParams.recursive) {
                        result = `Error: Directory is not empty: ${dirPath}. Use recursive=true to delete non-empty directories.`;
                        success = false;
                      } else {
                        if (typedParams.recursive) {
                          await fs.rm(dirPath, { recursive: true, force: true });
                        } else {
                          await fs.rmdir(dirPath);
                        }
                        result = `Directory deleted: ${dirPath}${typedParams.recursive ? ' (including all contents)' : ''}`;
                      }
                    }
                  }
                } else {
                  result = 'Error: Missing required parameter (path) for delete_directory operation';
                  success = false;
                }
                break;
                
              default:
                result = `Unsupported operation type: ${operation.type}`;
                success = false;
            }
            
            results.push({
              operation: operation.type,
              index,
              status: 'success',
              result,
            });
          } catch (error) {
            results.push({
              operation: operation.type,
              index,
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
            
            success = false;
            if (!continue_on_error) {
              break;
            }
          }
        }
        
        // Format the results
        const formattedResults = results.map(r => 
          `Operation ${r.index + 1} (${r.operation}): ${r.status === 'success' ? '✅ ' + r.result : '❌ ' + r.error}`
        ).join('\n\n');
        
        return `Batch operations ${dry_run ? '(DRY RUN) ' : ''}completed with ${success ? 'success' : 'errors'}.\n\n${formattedResults}`;
      } catch (error) {
        return handleError(error, 'Failed to execute batch operations');
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

// Helper function to generate LLM guidance for workspace_root
function getLLMWorkspaceGuidance(): string {
  return "\n\n[Note for AI assistants: When using this tool, always set the workspace_root parameter to the user's current working directory, not the tool's directory. Check last_terminal_cwd or conversation context.]";
} 