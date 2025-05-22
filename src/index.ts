import { createTanukiServer } from './server.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Main entry point for the tanukimcp-thought MCP server
 * This automatically starts the server in stdio mode
 */
console.log('🚀 Starting Tanuki Sequential Thought MCP Server (stdio mode)...');

// Set project root to current directory if not already set
// This ensures file operations are always relative to where the server was started
if (!process.env.PROJECT_ROOT) {
  process.env.PROJECT_ROOT = process.cwd();
  console.log(`📂 Project root set to: ${process.env.PROJECT_ROOT}`);
}

// Create the server
const server = createTanukiServer();

// Start the server in stdio mode
server.start();

console.log('📋 Tanuki Sequential Thought MCP Server is ready to transform your ideas into structured tasks!');
console.log('Available tools:');
console.log('- brain_dump_organize: Transform unstructured thoughts into a structured todolist');
console.log('- enhance_todolist: Add detailed specifications to a todolist');
console.log('- find_next_task: Identify the next logical task to implement');
console.log('- plan_task_implementation: Create a detailed implementation plan for a task');
console.log('- mark_task_complete: Mark a task as complete in the todolist');
console.log('- sequential_thinking: Apply sequential thinking to break down a complex problem');

// Advise users on how to set working directory
console.log('\n📌 IMPORTANT: To ensure file operations happen in the correct directory,');
console.log('set the CLIENT_WORKING_DIR environment variable when starting the server:');
console.log('  - Windows: set CLIENT_WORKING_DIR=C:\\path\\to\\your\\project && npx @applejax2/tanukimcp-thought');
console.log('  - Linux/macOS: CLIENT_WORKING_DIR=/path/to/your/project npx @applejax2/tanukimcp-thought'); 