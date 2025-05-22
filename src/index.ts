import { createTanukiServer } from './server.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'fs';

/**
 * Main entry point for the tanukimcp-thought MCP server
 * This automatically starts the server in stdio mode
 */
console.log('🚀 Starting Tanuki Sequential Thought MCP Server (stdio mode)...');

// Set environment variables for Docker compatibility
process.env.ENABLE_QUICK_STARTUP = 'true';

// Check for IDE LLM mode flag
const useIdeLlm = process.argv.includes('--ide-llm');
if (useIdeLlm) {
  console.log('🧠 IDE LLM mode enabled - will use the IDE\'s built-in LLM capabilities');
  
  // Update config file if it exists
  try {
    const configPath = path.join(process.cwd(), 'tanuki-config.json');
    
    if (existsSync(configPath)) {
      try {
        const configData = JSON.parse(readFileSync(configPath, 'utf8'));
        configData.useIdeLlm = true;
        writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        console.log('✅ Updated tanuki-config.json with IDE LLM mode enabled');
      } catch (parseError) {
        console.error('Error parsing config file:', parseError);
        // Create a new config file if parsing fails
        const defaultConfig = {
          useIdeLlm: true,
          autoCreateConfig: true,
          projectRoot: process.cwd()
        };
        writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log('✅ Created new tanuki-config.json with IDE LLM mode enabled');
      }
    } else {
      // Create minimal config file
      const defaultConfig = {
        useIdeLlm: true,
        autoCreateConfig: true,
        projectRoot: process.cwd()
      };
      writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      console.log('✅ Created tanuki-config.json with IDE LLM mode enabled');
    }
  } catch (error) {
    console.error('⚠️ Failed to update config file:', error);
    // Continue execution even if config file update fails
  }
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

// Add information about IDE LLM mode
console.log('\n🧠 To use the IDE\'s built-in LLM capabilities instead of Ollama:');
console.log('  - Use the --ide-llm flag when starting the server:');
console.log('  - Windows: npx @applejax2/tanukimcp-thought --ide-llm');
console.log('  - Linux/macOS: npx @applejax2/tanukimcp-thought --ide-llm');
console.log('  - Or add "useIdeLlm": true to your tanuki-config.json file'); 