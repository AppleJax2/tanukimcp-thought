#!/usr/bin/env node

/**
 * Test script for simulating Smithery tool scanning
 * This helps debug tool scanning issues by simulating the environment
 */

// Set environment variables to mimic Smithery tool scanning
process.env.SMITHERY_HOSTED = 'true';
process.env.SMITHERY_TOOL_SCAN = 'true';
process.env.ENABLE_QUICK_STARTUP = 'true';
process.env.OPTIMIZE_FOR_TOOL_SCAN = 'true';

console.log('🔍 Simulating Smithery tool scanning environment');

// Import the server module
try {
  // Set a timeout to detect hanging
  const timeoutId = setTimeout(() => {
    console.error('❌ TIMEOUT: Tool scanning took too long (>5s)');
    console.error('This would cause Smithery tool scanning to fail');
    process.exit(1);
  }, 5000);
  
  // Use dynamic import for ES modules
  import('../dist/index.js').catch(error => {
    console.error('❌ Error importing module:', error);
    process.exit(1);
  });
  
  // Note: The script might not reach here if the imported module calls process.exit(0)
  // Which is actually what we want during tool scanning
  setTimeout(() => {
    console.error('⚠️ Server did not exit quickly during tool scan mode.');
    console.error('Check if process.exit(0) is called during tool scanning.');
    clearTimeout(timeoutId);
  }, 3000);
} catch (error) {
  console.error('❌ Error during tool scanning simulation:', error);
  process.exit(1);
} 