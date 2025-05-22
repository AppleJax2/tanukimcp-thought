// Fix Ollama references in server.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const filePath = path.join(__dirname, 'src', 'server.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Ollama check blocks
content = content.replace(/\/\/ Check Ollama requirements only when the tool is called\s+try {\s+await ensureOllamaRequirements\(\);\s+} catch \(error\) {\s+\/\/ In hosted environments, provide a more user-friendly error\s+return [^;]+;\s+}/g, 
  '// Tool now uses IDE\'s LLM by default');

// Replace executeWithOllamaOrFallback with executeWithIdeLlm
content = content.replace(/executeWithOllamaOrFallback/g, 'executeWithIdeLlm');

// Write the file back
fs.writeFileSync(filePath, content);

console.log('Fixed Ollama references in server.ts'); 