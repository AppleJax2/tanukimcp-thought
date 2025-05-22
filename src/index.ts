// Tool scan fast path: must be the very first code in the file!
if (process.env.SMITHERY_HOSTED === 'true' && process.env.SMITHERY_TOOL_SCAN === 'true') {
  // Use dynamic import for fs and path
  (async () => {
    const fs = await import('fs');
    const path = await import('path');
    try {
      const toolsManifest = fs.readFileSync(path.join(process.cwd(), 'tools-manifest.json'), 'utf-8');
      process.stdout.write(toolsManifest);
      process.exit(0);
    } catch (error) {
      process.stderr.write('Error reading tool manifest: ' + error + '\n');
      process.exit(1);
    }
  })();
}

import { createTanukiServer } from './server.js';
import path from 'path';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { OPTIMIZE_FOR_TOOL_SCAN } from './utils/llm-utils.js';
import { loadConfig, updateConfig } from './config/index.js';

/**
 * Main entry point for the tanukimcp-thought MCP server
 * This automatically starts the server in stdio mode
 * Uses IDE's built-in LLM capabilities exclusively - no local options
 */
console.log('🚀 Starting Tanuki Sequential Thought MCP Server (stdio mode)...');

// Set environment variables for Smithery compatibility
process.env.ENABLE_QUICK_STARTUP = 'true';
process.env.USE_IDE_LLM = 'true';

// Check for Smithery deployment
const isSmitheryDeployment = process.env.SMITHERY_HOSTED === 'true';
const isToolScan = process.env.SMITHERY_TOOL_SCAN === 'true';

// Special fast path for Smithery tool scanning (now handled at the very top)

if (isSmitheryDeployment) {
  console.log('📦 Running in Smithery deployment mode - optimized for tool scanning');
}

// Load configuration - IDE LLM is always enabled
const config = loadConfig();

// IDE LLM is always enabled
if (!config.useIdeLlm) {
  updateConfig('useIdeLlm', true);
  console.log('✅ Updated configuration with IDE LLM mode enabled');
}

// Set project root to current directory if not already set
// This ensures file operations are always relative to where the server was started
if (!process.env.PROJECT_ROOT) {
  process.env.PROJECT_ROOT = process.cwd();
  console.log(`📂 Project root set to: ${process.env.PROJECT_ROOT}`);
}

// Create the server
console.log('Creating server...');
const server = createTanukiServer();

// Start the server in stdio mode
console.log('Starting server...');
try {
  server.start();
  console.log('Server started successfully');
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}

// Print shortened message when in Smithery deployment to speed up tool scanning
if (isSmitheryDeployment || OPTIMIZE_FOR_TOOL_SCAN) {
  console.log('📋 Tanuki Sequential Thought MCP Server ready for Smithery deployment');
} else {
  console.log('📋 Tanuki Sequential Thought MCP Server is ready to transform your ideas into structured tasks!');
  console.log('Available tools:');
  console.log('- brain_dump_organize: Transform unstructured thoughts into a structured todolist');
  console.log('- enhance_todolist: Add detailed specifications to a todolist');
  console.log('- find_next_task: Identify the next logical task to implement');
  console.log('- plan_task_implementation: Create a detailed implementation plan for a task');
  console.log('- task_executor: Execute a planned task by implementing necessary file operations');
  console.log('- mark_task_complete: Mark a task as complete in the todolist');
  console.log('- create_file: Create a new file with specified content');
  console.log('- edit_file: Edit an existing file by applying changes');
  console.log('- delete_file: Delete a file from the workspace');
  console.log('- move_file: Move a file from one location to another');
  console.log('- copy_file: Copy a file from one location to another');
  console.log('- create_directory: Create a new directory');
  console.log('- list_directory: List contents of a directory');
  console.log('- delete_directory: Delete a directory');
  console.log('- batch_operations: Execute multiple file operations in a batch');
  
  // Advise users on how to set working directory
  console.log('\n📌 IMPORTANT: To ensure file operations happen in the correct directory,');
  console.log('set the CLIENT_WORKING_DIR environment variable when starting the server:');
  console.log('  - Windows: set CLIENT_WORKING_DIR=C:\\path\\to\\your\\project && npx @applejax2/tanukimcp-thought');
  console.log('  - Linux/macOS: CLIENT_WORKING_DIR=/path/to/your/project npx @applejax2/tanukimcp-thought');
} 