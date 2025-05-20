#!/usr/bin/env node

/**
 * Command-line entry point for tanukimcp-thought
 * Supports both stdio and HTTP modes
 */

// Check if 'http' is provided as an argument
const args = process.argv.slice(2);
const useHttp = args.includes('http');

if (useHttp) {
  console.log('📡 Starting in HTTP mode...');
  import('../dist/http.js');
} else {
  console.log('🖥️ Starting in stdio mode...');
  import('../dist/index.js');
} 