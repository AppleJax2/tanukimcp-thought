// Dedicated entrypoint for Smithery tool scanning and normal startup
if (process.env.SMITHERY_HOSTED === 'true' && process.env.SMITHERY_TOOL_SCAN === 'true') {
  // Use CommonJS require for maximum compatibility
  const fs = require('fs');
  const path = require('path');
  try {
    const toolsManifest = fs.readFileSync(path.join(process.cwd(), 'tools-manifest.json'), 'utf-8');
    process.stdout.write(toolsManifest);
    process.exit(0);
  } catch (error) {
    process.stderr.write('Error reading tool manifest: ' + error + '\n');
    process.exit(1);
  }
}
// Normal startup (ESM main entry)
import('./dist/index.js'); 