# 🦝 Tanuki Sequential Thought MCP

A sequential thinking framework for AI assistants that transforms unstructured thoughts into organized, executable tasks using your IDE's built-in LLM capabilities.

## 🚀 Installation via Smithery

Install this MCP server instantly through [Smithery](https://smithery.ai):

1. Visit [smithery.ai](https://smithery.ai) and search for "tanukimcp-thought"
2. Click "Install" and copy the generated configuration
3. Add the configuration to your MCP client (Claude Desktop, Cursor, etc.)
4. Restart your client - you're ready to go!

### Manual Installation

If you prefer manual installation, add this to your MCP configuration:

```json
{
  "mcpServers": {
    "tanukimcp-thought": {
      "command": "npx",
      "args": ["@applejax2/tanukimcp-thought@latest"]
    }
  }
}
```

## 🧠 What is Sequential Thinking?

This MCP implements a structured approach to breaking down complex projects:

1. **🧠 Brain Dump** → Transform scattered thoughts into organized tasks
2. **🔍 Find Next** → Identify the logical next step to implement  
3. **📋 Plan** → Create detailed implementation strategy
4. **🛠️ Execute** → Actually build/modify files in your workspace
5. **✅ Complete** → Mark tasks as finished and track progress

## 🛠️ Available Tools

### Core Sequential Workflow
- `brain_dump_organize` - Transform unstructured thoughts into structured todolist
- `find_next_task` - Identify the next logical task to implement
- `plan_task_implementation` - Create detailed implementation plan
- `task_executor` - Execute plans by creating/modifying files
- `mark_task_complete` - Mark tasks as complete in todolist

### File Operations
- `create_file` - Create new files with content
- `edit_file` - Edit existing files (replace, append, prepend, insert)
- `delete_file` - Delete files safely
- `move_file` - Move files between locations
- `copy_file` - Copy files to new locations
- `create_directory` - Create directories
- `list_directory` - List directory contents
- `delete_directory` - Delete directories
- `batch_operations` - Execute multiple file operations

## 🎯 How to Use

### Step 1: Organize Your Thoughts

Start any project by dumping your ideas:

```
Use brain_dump_organize with:
- project_description: "Personal Finance Tracker App"
- unstructured_thoughts: "Need login system, expense tracking, budget goals, charts, mobile responsive, dark mode, export data"
- workspace_root: "/path/to/your/project"
```

### Step 2: Follow the Sequential Flow

```
1. Use find_next_task with your todolist file
2. Use plan_task_implementation for the identified task  
3. Use task_executor to implement the plan
4. Use mark_task_complete when done
5. Repeat until project complete!
```

### Example: Building a Weather App

```markdown
## Brain Dump
Use brain_dump_organize:
- project_description: "Desktop Weather App"
- unstructured_thoughts: "Fetch weather API, GUI interface, location search, 5-day forecast, weather icons, unit conversion, save favorites"
- workspace_root: "C:/Users/yourname/WeatherApp"

## Find & Execute Tasks
1. find_next_task → "Set up project structure"
2. plan_task_implementation → Creates detailed plan
3. task_executor → Builds the files and folders
4. mark_task_complete → Updates todolist

Repeat this cycle for each task!
```

## 🔑 Critical: Workspace Root Parameter

**EVERY tool requires the `workspace_root` parameter** - this must be the absolute path to where you want files created.

✅ **Correct Usage:**
```
workspace_root: "C:/Users/yourname/my-project"
workspace_root: "/home/user/projects/my-app"
```

❌ **Incorrect Usage:**
```
workspace_root: "."
workspace_root: "my-project"  
# Missing workspace_root parameter
```

### For AI Assistants

When using these tools, **always** check the conversation context for the user's current working directory and pass it as `workspace_root`. Look for:
- Terminal output showing current directory
- User statements like "I'm working in /path/to/project"
- File paths mentioned in conversation

## 🧠 IDE LLM Integration

This MCP exclusively uses your IDE's built-in LLM capabilities:

- **Claude Desktop** - Uses Claude for intelligent task analysis
- **Cursor** - Leverages integrated Claude/GPT models
- **VS Code** - Works with Claude or Copilot extensions
- **Other MCP Clients** - Uses whatever LLM the client provides

**No external dependencies** - no local LLM installation required. The intelligence comes from your IDE's LLM integration.

## 🎯 Example Workflows

### Web Application Development
```
1. brain_dump_organize: "React todo app with authentication"
   - thoughts: "Login page, todo list, add/edit/delete todos, user profiles, responsive design"
   
2. find_next_task → "Set up React project structure"
3. plan_task_implementation → Creates package.json, folder structure plan
4. task_executor → Actually creates files and folders
5. Continue cycle for each feature...
```

### API Development  
```
1. brain_dump_organize: "REST API for blog platform"
   - thoughts: "User auth, CRUD posts, comments, file uploads, rate limiting"
   
2. Sequential implementation of each endpoint
3. Each task creates actual code files in your workspace
```

### Desktop Application
```
1. brain_dump_organize: "Python GUI calculator app"
   - thoughts: "Basic operations, scientific mode, history, themes, keyboard shortcuts"
   
2. Build systematically from basic UI to advanced features
3. Each step creates real Python files you can run
```

## 🔧 Advanced Features

### Batch Operations
Execute multiple file operations at once:
```
batch_operations:
- operations: [
    {type: "create_file", path: "src/main.py", content: "..."},
    {type: "create_directory", path: "tests"},
    {type: "copy_file", source: "template.js", destination: "src/app.js"}
  ]
```

### Smart Task Dependencies
The `find_next_task` tool analyzes your todolist and suggests tasks based on:
- Logical dependencies (database before API routes)
- Complexity progression (simple features before complex ones)
- Current project state

## 🚨 Important Notes

1. **Workspace Root is Required** - Every tool needs the absolute path to your project
2. **IDE LLM Only** - This MCP uses your IDE's LLM exclusively, no fallback logic
3. **Real File Operations** - Tools create/modify actual files in your workspace
4. **Sequential Approach** - Follow the workflow for best results, but tools work independently too

## 📄 License

MIT License - Build amazing things! 🚀

## 🔗 Links

- [Smithery Installation](https://smithery.ai)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Report Issues](https://github.com/your-repo/issues) 