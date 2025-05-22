# Tanuki Sequential Thought MCP

Transform disorganized thoughts into structured, executable tasks with production-quality implementation plans. This MCP server implements the Sequential Prompting Framework for AI agents.

## 📋 Installation

There are two ways to use this MCP:

### Option 1: Hosted Installation (via Cursor/Smithery)

This option is simple to set up but **does not use local LLMs** - it will fall back to rule-based processing.

1. Go to [smithery.ai/server/@AppleJax2/tanukimcp-thought](https://smithery.ai/server/@AppleJax2/tanukimcp-thought) and use the auto-install command, or manually add this to your `.cursor/mcp.json` file:

   ```json
   "tanukimcp-thought": {
     "command": "npx",
     "args": ["@applejax2/tanukimcp-thought@latest"]
   }
   ```

2. That's it! Your AI agent now has access to the Sequential Prompting Framework tools, though without LLM-powered reasoning.

### Option 2: Local Installation (with LLM-powered reasoning)

For full functionality with LLM-powered reasoning, run the MCP locally:

1. **Install [Ollama](https://ollama.ai/)**
   
   Download and install from:
   - **Mac**: [ollama.ai](https://ollama.ai/)
   - **Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`
   - **Windows**: [Windows installer](https://ollama.ai/)

2. **Install a compatible language model**

   This MCP uses [DeepSeek-R1](https://ollama.com/library/deepseek-r1) by default:
   
   ```bash
   ollama pull deepseek-r1
   ```
   
   Alternative models you can use include:
   - deepseek-r1 (default, best performance)
   - llama3.1
   - qwen3
   - mistral-small3.1
   - phi4-reasoning
   - cogito

3. **Run Ollama**
   
   Make sure Ollama is running:
   ```bash
   ollama serve
   ```
   
   Or start the Ollama application from your desktop.

4. **Clone and Build the MCP Server Locally (Complete Method)**

   For the most reliable setup, clone and build the MCP server:

   ```bash
   # Clone the repository
   git clone https://github.com/applejax2/tanukimcp-thought.git
   cd tanukimcp-thought

   # Install dependencies
   npm install

   # Build the project
   npm run build

   # Start the server
   npm start
   ```

   Alternatively, you can run directly with npx (Quick Method):
   ```bash
   npx @applejax2/tanukimcp-thought@latest
   ```

   This starts the MCP server locally where it can access your Ollama installation.

   **Note the port number** in the console output (default is usually 3000).
   
   **Important:** Keep this terminal window open as long as you want the MCP server to run.

5. **Create Configuration (Optional)**

   Create a `tanuki-config.json` file in your project directory:
   ```json
   {
     "llmModel": "deepseek-r1",
     "ollamaParams": {
       "num_ctx": 16384,
       "temperature": 0.7,
       "top_p": 0.9,
       "num_thread": 8
     },
     "autoCreateConfig": true
   }
   ```

### Connecting Cursor to Your Local MCP Server

To use LLM-powered capabilities directly within Cursor, you can connect Cursor to your locally running MCP server:

1. **Find your local MCP server port**
   
   When you start the MCP server, it will output the port it's running on (typically 3000).
   
   Make sure the server is running and shows a message like:
   ```
   MCP server listening on port 3000
   ```

2. **Update your `.cursor/mcp.json` file**
   
   Edit your `.cursor/mcp.json` file (usually in your home directory) to point to your local server:

   ```json
   "tanukimcp-thought": {
     "url": "http://localhost:3000"
   }
   ```

   Replace `3000` with the actual port number if different.

3. **Restart Cursor**
   
   After updating the config, restart Cursor for the changes to take effect.

4. **Verify the connection**
   
   Try using one of the tools in a project. You should see more detailed, LLM-powered responses compared to the hosted version.
   
   If tools are not showing up in Cursor:
   - Ensure the local MCP server is running (check the terminal)
   - Verify your `.cursor/mcp.json` has the correct URL
   - Make sure Cursor was fully restarted after the config change
   - Try restarting both the MCP server and Cursor

### Using API Directly (Alternative)

If you don't want to modify your Cursor configuration, you can also use the local MCP server's API directly:

```bash
# Example of calling a tool via curl
curl -X POST http://localhost:3000/api/tools/brain_dump_organize \
  -H "Content-Type: application/json" \
  -d '{"project_description":"My project","unstructured_thoughts":"thought 1, thought 2"}'
```

### Choosing the Right Installation

- **Use hosted installation** (Option 1) if you want a simple setup and don't mind rule-based (non-LLM) processing.
- **Use local installation** (Option 2) if you want enhanced, LLM-powered reasoning capabilities. This provides significantly better analysis, planning, and implementation.
- **Connect Cursor to local MCP** if you want the best of both worlds: using Cursor's interface with the power of local LLMs.

## 🔍 What is the Sequential Prompting Framework?

The Sequential Prompting Framework is a structured approach to working with AI agents, breaking down the process into three key phases:

1. **Capture & Organize** - Transform scattered thoughts into a structured todolist
2. **Enhance & Refine** - Add production-quality details to each task
3. **Implement Tasks** - Execute one task at a time with clear standards

Each phase builds upon the previous one, creating a workflow that maintains context and ensures high-quality results. This framework is applicable to projects of any scale - from small refactors to building entire applications from scratch.

## 🛠️ Available Tools

### Phase 1: Brain Dump & Organization

```
mcp_tanukimcp-thought_brain_dump_organize
```

Transform unstructured thoughts into a structured markdown todolist. This tool uses a local LLM to analyze your input and create an organized todolist with logical categories.

### Phase 2: Enhance & Refine

```
mcp_tanukimcp-thought_enhance_todolist
```

Add detailed specifications, acceptance criteria, and technical requirements to your todolist. The LLM analyzes your existing tasks and enhances them with implementation details.

### Phase 3: Sequential Task Implementation

```
mcp_tanukimcp-thought_find_next_task
mcp_tanukimcp-thought_plan_task_implementation
mcp_tanukimcp-thought_mark_task_complete
mcp_tanukimcp-thought_task_executor
mcp_tanukimcp-thought_sequential_thinking
```

Find, plan, implement, and track tasks in a logical sequence:

- **find_next_task** - Identifies the most logical next task to implement based on dependencies
- **plan_task_implementation** - Creates a detailed implementation plan for a specific task
- **task_executor** - Actually implements the task by performing the necessary file operations
- **mark_task_complete** - Updates the todolist to mark a task as complete
- **sequential_thinking** - Applies sequential thinking to break down a complex problem

## 🔄 Example Workflow

Here's a complete workflow example showing how to build a simple GUI application that can be packaged as an executable:

### 1. Organize your thoughts

```
I want to build a simple Python GUI weather app. Please use the brain_dump_organize tool with these parameters:
project_description: "A desktop weather application with GUI that can be packaged as an executable"
unstructured_thoughts: "- Need to fetch weather data from an API
- Should have a clean, modern interface
- Display current weather conditions
- Show forecast for upcoming days
- Allow users to search for different locations
- Save user's preferred locations
- Error handling for network issues
- Package as executable for Windows/Mac
- Add weather icons
- Temperature unit conversion
- Dark/light theme"
```

### 2. Enhance with specifications

```
Now please use the enhance_todolist tool with these parameters:
input_file: "tooltodo.md"
```

### 3. Start sequential implementation

```
Please use the find_next_task tool with:
todolist_file: "tooltodo.md"

Then use the plan_task_implementation tool with:
task: "[the task identified by find_next_task]"
todolist_file: "tooltodo.md"

Finally, use the task_executor tool with:
task: "[same task as above]"
todolist_file: "tooltodo.md"
```

### 4. Continue implementation

```
Please use find_next_task again with:
todolist_file: "tooltodo.md"

Then use plan_task_implementation with:
task: "[the newly identified task]"
todolist_file: "tooltodo.md"

Follow with task_executor:
task: "[same task as above]"
todolist_file: "tooltodo.md"
```

### 5. Complete remaining tasks

```
Please continue using this sequence of tools:
1. find_next_task with todolist_file: "tooltodo.md"
2. plan_task_implementation with the identified task and todolist_file: "tooltodo.md"
3. task_executor with the same task and todolist_file: "tooltodo.md"

Repeat until all tasks are complete. The tasks should be marked complete automatically, but if needed, use mark_task_complete.
```

The AI agent will:
1. Identify which task should be done next
2. Plan how to implement that task with specific steps
3. Execute the implementation by creating/editing files
4. Mark the task as complete and move to the next one

This process continues until your application is fully implemented, including:
- Setting up the project structure
- Building the GUI with a framework like Tkinter or PyQt
- Implementing the weather API integration
- Adding all features from the todolist
- Configuring packaging with PyInstaller for creating an executable

## 🚀 Advanced Configuration

### Customizing the Language Model

You can customize the model and its parameters by creating a `tanuki-config.json` file in your project:

```json
{
  "llmModel": "deepseek-r1",
  "ollamaParams": {
    "num_ctx": 16384,
    "temperature": 0.7,
    "top_p": 0.9,
    "num_thread": 8
  },
  "autoCreateConfig": true
}
```

Replace "deepseek-r1" with any compatible Ollama model you've installed.

The `ollamaParams` object supports the following configuration options:
- `num_ctx`: Maximum context window size (default: 16384)
- `temperature`: Controls randomness of output (0.0-1.0, default: 0.7)
- `top_p`: Controls diversity via nucleus sampling (0.0-1.0, default: 0.9)
- `num_thread`: Number of threads to use for computation (default: 8)

The `autoCreateConfig` flag (default: true) automatically creates this configuration file with optimal settings if it doesn't exist.

## 🧠 LLM Integration

When running locally, this MCP uses local language models through Ollama to provide intelligent processing of your thoughts and tasks:

1. Your unstructured thoughts are analyzed and organized into logical categories
2. Todolist items are enhanced with detailed specifications and implementation considerations
3. Tasks are prioritized based on dependencies and logical order
4. Implementation plans are created with step-by-step instructions
5. The task executor translates plans into concrete file operations

**Note:** These LLM features are only available when running the MCP locally with Ollama. The hosted version (via Smithery) will use rule-based processing instead.

## 🛠️ Task Executor Capabilities

The `task_executor` tool is the final piece of the Sequential Prompting Framework, turning plans into real implementations. It can:

1. **Create New Files** - Generate new code files, configurations, or documentation
2. **Edit Existing Files** - Modify existing code with surgical precision
3. **Delete Files** - Remove deprecated or unnecessary files
4. **Mark Tasks Complete** - Automatically update the todolist when implementation succeeds

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎓 Based on the Sequential Prompting Framework

The concepts in this MCP server implement the Sequential Prompting Framework methodology for transforming unstructured thoughts into structured, executable tasks with clear implementation plans, turning ideas into functioning code through a logical, stepwise process. 