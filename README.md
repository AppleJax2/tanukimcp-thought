# 🦝 Tanuki Sequential Thought MCP

The Tanuki Sequential Thought MCP is a modular thinking toolkit for AI assistants, implementing the Sequential Prompting Framework to break down complex tasks into manageable steps.

🚨 **IMPORTANT**: When using the tools, always provide the `workspace_root` parameter with the absolute path to the user's current working directory. This is a required parameter for all tools. The LLM should check context like `last_terminal_cwd` to determine where the user is working.

## 🧩 Key Components

Each tool in the framework serves a distinct purpose in the sequential problem-solving process:

| Tool | Purpose | Real-World Analogy |
|------|---------|-------------------|
| 🧠 **Brain Dump & Organize** | `brain_dump_organize` | Turn scattered thoughts into structured tasks | Architect sketching initial building plans |
| 🔍 **Find Next Task** | `find_next_task` | Identify logical next step in todolist | Project manager selecting next milestone |
| 📝 **Plan Implementation** | `plan_task_implementation` | Create detailed plan for a specific task | Blueprint for a specific room |
| 🛠️ **Execute** | `task_executor` | Actually create/modify files in your workspace | Building the actual house, one section at a time |
| ✅ **Mark Complete** | `mark_task_complete` | Update todolist when task is finished | Checking off completed work |

## 🔑 Working Directory Behavior

All operations require the `workspace_root` parameter, which MUST be an absolute path to the user's current working directory.

LLMs/AI assistants: You MUST check the conversation context (e.g., `last_terminal_cwd`) to determine the current working directory. This should be passed as the workspace_root parameter to all tool calls.

### How to get the correct workspace_root:

1. **For Claude/AI assistants**: Look for the `last_terminal_cwd` in the conversation context, which contains the absolute path to the user's current working directory.

2. **For other assistants**: Look for directory information in the conversation (e.g., "I'm working in C:\Projects\MyApp").

3. **Fallbacks are removed**: Unlike previous versions, the tool will NOT attempt to guess the working directory. It will throw an error if workspace_root is not provided or is not an absolute path.

### Example:

If you see this in the conversation context:
```
<last_terminal_cwd>
You have an active shell. Whenever you use the run_terminal_cmd tool, your commands will run in the following working directory: C:\Users\username\MyProject
</last_terminal_cwd>
```

Then use:
```
Please use mcp_tanukimcp-thought_create_file with:
path: "myfile.txt"
content: "Hello world"
workspace_root: "C:\Users\username\MyProject"
```

## 🔧 Installation

Install globally:

```bash
npm install -g @applejax2/tanukimcp-thought
```

## 📋 Usage

Start the server:

```bash
npx @applejax2/tanukimcp-thought
```

### Basic Usage Flow

1. Start with mcp_tanukimcp-thought_brain_dump_organize to create a structured todolist
2. Use mcp_tanukimcp-thought_find_next_task to identify what to work on
3. Use mcp_tanukimcp-thought_plan_task_implementation to create a detailed plan
4. Use mcp_tanukimcp-thought_task_executor to implement the task
5. Use mcp_tanukimcp-thought_mark_task_complete when done

## 🎭 Supported Actions

The following standalone actions are also available:

- mcp_tanukimcp-thought_create_file
- mcp_tanukimcp-thought_edit_file
- mcp_tanukimcp-thought_delete_file
- mcp_tanukimcp-thought_move_file
- mcp_tanukimcp-thought_copy_file
- mcp_tanukimcp-thought_create_directory
- mcp_tanukimcp-thought_list_directory
- mcp_tanukimcp-thought_delete_directory
- mcp_tanukimcp-thought_batch_operations

## 🚀 Quick Start

### 1. Create a structured todolist from brainstorming

```
Please use mcp_tanukimcp-thought_brain_dump_organize with:
project_description: "Personal Finance Tracker"
unstructured_thoughts: "
- Need to track monthly income and expenses
- Show summary of spending categories
- Create graphs for visualization
- Allow setting budget goals
- Send notification when close to budget limit
"
workspace_root: "C:\Users\username\finance-app"
```

### 2. Find the next task to implement

```
Please use mcp_tanukimcp-thought_find_next_task with:
todolist_file: "personal_finance_tracker_todo.md" 
workspace_root: "C:\Users\username\finance-app"
```

### 3. Plan a task implementation

```
Please use mcp_tanukimcp-thought_plan_task_implementation with:
task: "Create a dashboard component showing monthly spending summary"
todolist_file: "personal_finance_tracker_todo.md"
workspace_root: "C:\Users\username\finance-app"
```

### 4. Execute the task implementation

```
Please use mcp_tanukimcp-thought_task_executor with:
task: "Create a dashboard component showing monthly spending summary"
todolist_file: "personal_finance_tracker_todo.md"
workspace_root: "C:\Users\username\finance-app"
```

### 5. Mark the task as complete

```
Please use mcp_tanukimcp-thought_mark_task_complete with:
task: "Create a dashboard component showing monthly spending summary"
todolist_file: "personal_finance_tracker_todo.md"
workspace_root: "C:\Users\username\finance-app"
```

## 🧠 Understanding the Sequential Prompting Framework

Think of the Sequential Prompting Framework like building a house:

| Phase | Tool | Purpose | Like... |
|-------|------|---------|---------|
| 🧠 **Capture & Organize** | `brain_dump_organize` | Transform messy ideas into structured tasks | Gathering materials and drawing initial sketches |
| 📋 **Enhance & Refine** | `enhance_todolist` | Add technical details and specifications | Creating detailed blueprints with measurements |
| 🔍 **Find Next Task** | `find_next_task` | Determine logical next step | Deciding whether to build foundation or walls next |  
| 📊 **Plan Implementation** | `plan_task_implementation` | Create detailed implementation strategy | Creating specific instructions for the builders |
| 🛠️ **Execute** | `task_executor` | Actually create/modify files in your workspace | Building the actual house, one section at a time |

**You can use these tools in two ways:**
- **Full Workflow**: Use all five tools in sequence to go from idea to working code
- **Individual Tools**: Need only specific help? Use any tool independently (see [Tools Reference](#%EF%B8%8F-tools-reference))

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

For full functionality with LLM-powered reasoning, follow these comprehensive steps to run the MCP locally:

#### Step 1: Install Ollama

Ollama is the local LLM engine that powers the intelligent reasoning capabilities of this MCP server. Follow these platform-specific installation instructions:

**Windows:**
1. Download the installer from [ollama.ai](https://ollama.ai/).
2. Run the installer and follow the on-screen instructions.
3. After installation, Ollama will start automatically and be accessible at `http://localhost:11434`.
4. Verify installation by opening a command prompt and running: `curl http://localhost:11434/api/version`

**Mac:**
1. Download and install Ollama from [ollama.ai](https://ollama.ai/).
2. After installation, launch Ollama from your Applications folder.
3. Verify installation by opening Terminal and running: `curl http://localhost:11434/api/version`

**Linux:**
1. Open a terminal and run: `curl -fsSL https://ollama.ai/install.sh | sh`
2. After installation, start Ollama by running: `ollama serve`
3. Verify installation with: `curl http://localhost:11434/api/version`

#### Step 2: Install a Compatible Language Model

This MCP works with several Ollama models, but [DeepSeek-R1](https://ollama.com/library/deepseek-r1) is recommended for best performance:

1. Open a terminal or command prompt.
2. Run the following command to download the model:
   ```bash
   ollama pull deepseek-r1
   ```
3. Wait for the model to download completely (this may take several minutes depending on your internet speed).
4. Verify the model was installed by running: `ollama list`

Alternative models that work with this MCP include:
- deepseek-r1 (default, best performance)
- llama3.1
- qwen3
- mistral-small3.1
- phi4-reasoning
- cogito

#### Step 3: Ensure Ollama is Running

Before proceeding, ensure Ollama is running and accessible:

**Windows/Mac:**
1. Ensure the Ollama application is running (check for its icon in your system tray or menu bar).
2. If not running, start it from your applications menu.

**Linux:**
1. Run `ollama serve` in a terminal window.
2. Keep this terminal open while using the MCP.

In all cases, verify Ollama is responding by running:
```bash
curl http://localhost:11434/api/version
```
This should return a JSON object with the version information.

#### Step 4: Set Up the MCP Server (Complete Method)

For the most reliable setup, follow these steps to clone and build the MCP server:

1. **Clone the repository**
   ```bash
   # Clone the repository
   git clone https://github.com/applejax2/tanukimcp-thought.git
   cd tanukimcp-thought
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the server in HTTP mode** (this is crucial for Cursor integration)
   ```bash
   npm run start:http
   ```

   **IMPORTANT:** Note the port number and SSE endpoint in the console output. You should see a message like:
   ```
   🚀 Starting Tanuki Sequential Thought MCP Server (HTTP mode)...
   📋 Tanuki Sequential Thought MCP Server is running at http://localhost:3001/sse
   ```
   
   Take note of both the port number (e.g., 3001) and the fact that the endpoint includes `/sse`.
   
   **Critical:** Keep this terminal window open as long as you want the MCP server to run. Closing it will terminate the server.

Alternatively, you can use the Quick Method with npx, though the Complete Method is recommended for more reliable operation:
```bash
npx @applejax2/tanukimcp-thought@latest start:http
```

#### Step 5: Create Configuration File

Create a `tanuki-config.json` file in your project directory to customize the LLM and its parameters:

1. Create a new file named `tanuki-config.json` in the root of your project directory.
2. Add the following content to the file:
   ```json
   {
     "llmModel": "deepseek-r1",
     "ollamaParams": {
       "num_ctx": 16384,
       "temperature": 0.7,
       "top_p": 0.9,
       "num_thread": 8
     },
     "autoCreateConfig": true,
     "projectRoot": "/path/to/your/project"
   }
   ```
3. Customize any parameters as needed:
   - `llmModel`: The Ollama model you installed (e.g., "deepseek-r1", "llama3.1")
   - `num_ctx`: Maximum context window size (larger values allow more context but use more memory)
   - `temperature`: Controls randomness (0.0-1.0, lower values = more deterministic output)
   - `top_p`: Controls diversity (0.0-1.0, higher values = more diverse output)
   - `num_thread`: Number of CPU threads to use (adjust based on your hardware)

The `projectRoot` option (default: current working directory) specifies the base directory for all file operations. This is useful when you're running the MCP server from a different directory than your project.

### Connecting Cursor to Your Local MCP Server

To use LLM-powered capabilities directly within Cursor, follow these detailed steps to connect Cursor to your locally running MCP server:

#### Step 1: Locate Your MCP Server Information

Before configuring Cursor, make sure you have:
1. Your MCP server running in HTTP mode using `npm run start:http`
2. The port number from the console output (typically 3001)
3. Noted that the endpoint includes `/sse` (this is critical)

You should see a message like:
```
🚀 Starting Tanuki Sequential Thought MCP Server (HTTP mode)...
📋 Tanuki Sequential Thought MCP Server is running at http://localhost:3001/sse
```

#### Step 2: Locate and Edit Your Cursor MCP Configuration

1. **Find your `.cursor/mcp.json` file**:
   - **Windows**: Usually located at `C:\Users\<YourUsername>\.cursor\mcp.json`
   - **Mac/Linux**: Usually located at `~/.cursor/mcp.json`
   
   If the file doesn't exist, create it with an empty JSON object: `{}`

2. **Edit the file** to add your local MCP server configuration:
   ```json
   {
     "mcpServers": {
       "tanukimcp-thought": {
         "url": "http://localhost:3001/sse"
       }
     }
   }
   ```

   **IMPORTANT**: Make sure to include the full URL with the port number AND the `/sse` endpoint. The `/sse` part is crucial for proper communication.

   If your `mcp.json` already has other entries, just add the `tanukimcp-thought` entry to the existing `mcpServers` object:
   ```json
   {
     "mcpServers": {
       "existing-mcp": { /* existing config */ },
       "tanukimcp-thought": {
         "url": "http://localhost:3001/sse"
       }
     }
   }
   ```

3. **Save the file** after making these changes.

#### Step 3: Restart Cursor

After updating the configuration:
1. **Close Cursor completely** (not just the window, but exit the application)
2. **Wait a few seconds** to ensure all processes terminate
3. **Start Cursor again**

#### Step 4: Verify the Connection

To ensure your local MCP server with LLM capabilities is connected:

1. **Open a project in Cursor**
2. **Try using one of the tools** by typing a comment like:
   ```
   // Use mcp_tanukimcp-thought_brain_dump_organize
   ```
   
3. **Check the server logs** in your terminal where the MCP is running. You should see activity when the tool is invoked.

4. **Verify LLM processing** by observing the quality and detail of the output. LLM-powered responses will be more sophisticated than rule-based processing.

#### Troubleshooting Connection Issues

If you encounter issues connecting Cursor to your local MCP server, try these troubleshooting steps:

1. **Verify Ollama is running**:
   ```bash
   curl http://localhost:11434/api/version
   ```
   Should return a JSON response with version information.

2. **Verify MCP server is running in HTTP mode**:
   - Ensure you used `npm run start:http` and not just `npm start`
   - Look for the message confirming HTTP mode and the `/sse` endpoint

3. **Test the MCP server endpoint**:
   ```bash
   curl http://localhost:3001/sse
   ```
   This might not return immediate data, but should not error out.

4. **Check your mcp.json configuration**:
   - Ensure the URL includes the port number AND `/sse`
   - Verify JSON syntax is correct (no missing commas, brackets, etc.)

5. **Reload MCPs in Cursor**:
   - Open Command Palette (Ctrl+Shift+P)
   - Type and select "Reload MCPs"
   - Wait a few seconds for reload to complete

6. **Alternative Connection Method**:
   If direct URL connection fails, try using Smithery as a bridge:
   1. Install Smithery CLI: `npm install -g smithery`
   2. In a new terminal, run: `npx smithery link http://localhost:3001/sse tanukimcp-thought`
   3. Update your `.cursor/mcp.json`:
      ```json
      "tanukimcp-thought": {
        "command": "cmd",
        "args": [
          "/c", 
          "npx", 
          "-y", 
          "smithery", 
          "run", 
          "tanukimcp-thought"
        ]
      }
      ```
   4. Restart Cursor completely

7. **Full Reset**:
   If all else fails:
   1. Stop your MCP server
   2. Close Cursor
   3. Restart Ollama
   4. Start your MCP server with `npm run start:http`
   5. Start Cursor
   6. Try using the tools again

### Using API Directly (Alternative)

If you prefer to interact with the MCP server's API directly without going through Cursor, you can make HTTP requests to its endpoints:

```bash
# Example of calling the brain_dump_organize tool via curl
curl -X POST http://localhost:3001/api/tools/brain_dump_organize \
  -H "Content-Type: application/json" \
  -d '{"project_description":"My project","unstructured_thoughts":"thought 1, thought 2"}'
```

Replace the port number and endpoint with those displayed in your server's console output.

### Choosing the Right Installation

Your choice of installation method depends on your specific needs:

- **Use hosted installation (Option 1)** if:
  - You want the simplest setup with minimal configuration
  - You don't need the enhanced reasoning capabilities of local LLMs
  - You're comfortable with rule-based processing rather than AI-powered analysis
  - You have limited system resources or don't want to run Ollama locally

- **Use local installation with LLM integration (Option 2)** if:
  - You need high-quality, AI-powered analysis and task planning
  - You want more sophisticated organization of thoughts and detailed implementation plans
  - You value privacy and want all processing to happen locally
  - You have sufficient system resources to run Ollama and the models
  - You're comfortable with a slightly more complex setup process

- **Connect Cursor to your local MCP** if:
  - You want the best of both worlds: using Cursor's interface with the power of local LLMs
  - You'll be using the tools frequently and want them integrated into your workflow
  - You want to take advantage of Cursor's AI capabilities alongside the Sequential Prompting Framework

The most powerful configuration is Option 2 with Cursor integration, as it provides LLM-powered reasoning directly within your development environment.

## 🛠️ Tools Reference

Each tool can be used independently or as part of the sequential workflow. Here's a detailed reference:

### 1. Brain Dump & Organization

```
mcp_tanukimcp-thought_brain_dump_organize
```

**Purpose**: Transform unstructured thoughts into a structured markdown todolist

**Parameters**:
- `project_description`: Brief description of the project
- `unstructured_thoughts`: Your raw, messy thoughts and ideas
- `output_file`: (Optional) Where to save the todolist (default: "<project>_todo.md")
- `overwrite`: (Optional) Whether to overwrite existing file (default: false)

**Returns**: A structured markdown todolist organized into logical categories

**When to Use Independently**:
- When you need to organize scattered ideas into a clear plan
- At the beginning of a new project
- When brainstorming features for an existing project

**Example**:
```
Please use mcp_tanukimcp-thought_brain_dump_organize with:
project_description: "Task management application"
unstructured_thoughts: "Need to create login page, signup page, task list, add task form, edit task, delete task, mark complete, user profile, dark mode, mobile responsive design"
```

### 2. Enhance & Refine

```
mcp_tanukimcp-thought_enhance_todolist
```

**Purpose**: Add detailed specifications and technical requirements to your todolist

**Parameters**:
- `input_file`: Path to the existing todolist file
- `output_file`: (Optional) Where to save the enhanced todolist (default: same as input)
- `overwrite`: (Optional) Whether to overwrite existing file (default: false)

**Returns**: An enhanced todolist with detailed specifications and implementation considerations

**When to Use Independently**:
- When you have a basic todolist that needs more detail
- Before implementation to ensure comprehensive planning
- When planning a complex feature

**Example**:
```
Please use mcp_tanukimcp-thought_enhance_todolist with:
input_file: "task_management_application_todo.md"
```

### 3. Find Next Task

```
mcp_tanukimcp-thought_find_next_task
```

**Purpose**: Identify the most logical next task to implement based on dependencies

**Parameters**:
- `todolist_file`: Path to the todolist file

**Returns**: The next logical task to implement with context from the todolist

**When to Use Independently**:
- When prioritizing work on a project
- When you're not sure what to work on next
- When multiple team members need task assignments

**Example**:
```
Please use mcp_tanukimcp-thought_find_next_task with:
todolist_file: "task_management_application_todo.md"
```

### 4. Plan Task Implementation

```
mcp_tanukimcp-thought_plan_task_implementation
```

**Purpose**: Create a detailed implementation plan for a specific task

**Parameters**:
- `task`: The task to plan implementation for
- `todolist_file`: Path to the todolist file for context

**Returns**: A comprehensive markdown implementation plan

**When to Use Independently**:
- When you need detailed guidance for implementing a specific task
- Before beginning complex implementation work
- When documenting how a feature should be implemented

**Example**:
```
Please use mcp_tanukimcp-thought_plan_task_implementation with:
task: "Create user authentication system"
todolist_file: "task_management_application_todo.md"
```

### 5. Task Executor

```
mcp_tanukimcp-thought_task_executor
```

**Purpose**: Execute the plan by creating/editing/deleting actual files in your workspace

**Parameters**:
- `task`: The task to implement
- `todolist_file`: Path to the todolist file
- `implementation_plan`: (Optional) Plan to follow (if not provided, one will be generated)
- `target_directory`: (Optional) Directory for file operations (default: current directory)

**Returns**: Execution results, summary of changes, and updated todolist

**When to Use Independently**:
- When you have a specific task and want files created/edited
- When implementing a feature with an existing plan
- When you want to automate repetitive coding tasks

**Example**:
```
Please use mcp_tanukimcp-thought_task_executor with:
task: "Create user authentication system"
todolist_file: "task_management_application_todo.md"
target_directory: "./my_project"
```

### 6. Mark Task Complete

```
mcp_tanukimcp-thought_mark_task_complete
```

**Purpose**: Update the todolist to mark a task as complete

**Parameters**:
- `task`: The task text to mark as complete
- `todolist_file`: Path to the todolist file

**Returns**: Updated todolist with the task marked complete

**When to Use Independently**:
- When manually marking a task as complete
- After implementing a task outside the sequential workflow
- When tracking progress on a project

**Example**:
```
Please use mcp_tanukimcp-thought_mark_task_complete with:
task: "Create user authentication system"
todolist_file: "task_management_application_todo.md"
```

### 7. Direct CRUD Tools

In addition to the sequential workflow tools, the following direct file operation tools are available for more granular control:

- **`create_file`**: Create a new file with specified content
- **`edit_file`**: Edit an existing file with various change types
- **`delete_file`**: Delete a file
- **`move_file`**: Move a file from one location to another
- **`copy_file`**: Copy a file to a new location

Each CRUD tool accepts a `workspace_root` parameter (default: ".") and appropriate safety parameters like `overwrite`.

## 🔄 Example Workflows

### Sequential Workflow Example: Building a Weather App

Here's a complete workflow example showing how to build a simple GUI application:

#### 1. Organize your thoughts

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

#### 2. Enhance with specifications

```
Now please use the enhance_todolist tool with these parameters:
input_file: "task_management_application_todo.md"
```

#### 3. Sequential implementation

```
# Find the next task to implement
Please use the find_next_task tool with:
todolist_file: "weather_app_todo.md"

# Create a plan for implementing that task
Then use the plan_task_implementation tool with:
task: "[the task identified by find_next_task]"
todolist_file: "weather_app_todo.md"

# Execute the plan to create/edit files
Finally, use the task_executor tool with:
task: "[same task as above]"
todolist_file: "weather_app_todo.md"
target_directory: "./WeatherApp"
```

#### 4. Continue implementation

```
# Repeat the process for each task
Please continue using this sequence of tools:
1. find_next_task with todolist_file: "weather_app_todo.md"
2. plan_task_implementation with the identified task and todolist_file: "weather_app_todo.md"
3. task_executor with the same task, todolist_file: "weather_app_todo.md", and target_directory: "./WeatherApp"

Repeat until all tasks are complete.
```

### Individual Tool Usage Examples

#### Using just the Brain Dump tool for project planning:

```
I need help organizing my thoughts for a new e-commerce website. Please use mcp_tanukimcp-thought_brain_dump_organize with:
project_description: "Modern e-commerce platform"
unstructured_thoughts: "Product listing page, product detail page, shopping cart, checkout process, payment integration, user accounts, order history, admin dashboard, inventory management, search functionality, filters, mobile responsive, SEO optimization"
output_file: "ecommerce_plan.md"
```

#### Using just the Task Executor for a specific implementation:

```
I need to implement a login page for my web application. Please use mcp_tanukimcp-thought_task_executor with:
task: "Create login page with username and password fields, validation, and authentication against backend API"
todolist_file: "my_project_todolist.md"
target_directory: "./my_web_app"
```

#### Using Find Next Task for prioritization:

```
I have many tasks in my todolist and I'm not sure which one to tackle next. Please use mcp_tanukimcp-thought_find_next_task with:
todolist_file: "project_todolist.md"
```

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
  "autoCreateConfig": true,
  "projectRoot": "/path/to/your/project"
}
```

Replace "deepseek-r1" with any compatible Ollama model you've installed.

The `ollamaParams` object supports the following configuration options:
- `num_ctx`: Maximum context window size (default: 16384)
- `temperature`: Controls randomness of output (0.0-1.0, default: 0.7)
- `top_p`: Controls diversity via nucleus sampling (0.0-1.0, default: 0.9)
- `num_thread`: Number of threads to use for computation (default: 8)

The `autoCreateConfig` flag (default: true) automatically creates this configuration file with optimal settings if it doesn't exist.

The `projectRoot` option (default: current working directory) specifies the base directory for all file operations. This is useful when you're running the MCP server from a different directory than your project.

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

## 🔑 Working Directory Behavior

By default, CRUD operations use the current working directory. However, if you're using the tools from another directory, you can control where files are created by:

1. Setting the `CLIENT_WORKING_DIR` environment variable when starting the server:
   ```bash
   # Windows
   set CLIENT_WORKING_DIR=C:\path\to\your\project && npx @applejax2/tanukimcp-thought

   # Linux/macOS
   CLIENT_WORKING_DIR=/path/to/your/project npx @applejax2/tanukimcp-thought
   ```

2. Explicitly passing the `workspace_root` parameter in your tool calls:
   ```
   Please use mcp_tanukimcp-thought_create_file with:
   path: "myfile.txt"
   content: "Hello world"
   workspace_root: "C:\path\to\your\project"
   ```

This ensures that file operations occur in the directory you expect, not in the directory where the server is running.

### 📝 For LLMs: Working Directory Detection

If you are an LLM (like Claude) reading this documentation, follow these guidelines:

1. **Always detect the user's current working directory** from conversation context, terminal metadata, or explicit user statements.

2. **Automatically include the workspace_root parameter** in all CRUD tool calls, setting it to the user's current working directory:
   ```
   workspace_root: "[user's current working directory]"
   ```

3. **Detect directory context changes** in the conversation. If the user says they're working in a specific directory, use that directory as the workspace_root.

4. **Default to the last known terminal directory** if available in your context (often provided as `last_terminal_cwd`).

5. **Never assume** the user is working in the same directory as the tool itself.

Example of correct tool call with automatic directory detection:
```
// If last_terminal_cwd shows user is in C:\Users\username\project
Please use mcp_tanukimcp-thought_create_file with:
path: "config.json"
content: "{}"
workspace_root: "C:\\Users\\username\\project"
``` 