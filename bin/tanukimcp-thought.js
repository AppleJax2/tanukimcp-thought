#!/usr/bin/env node

/**
 * Command-line entry point for tanukimcp-thought
 * Uses stdio mode exclusively for Smithery deployment
 */

// Always use IDE LLM mode
process.argv.push('--ide-llm');

// Start in stdio mode
console.log('🖥️ Starting in stdio mode with IDE LLM capabilities...');
import('../dist/index.js'); 