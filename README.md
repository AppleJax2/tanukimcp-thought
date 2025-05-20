# Tanuki Sequential Thought MCP

Transform disorganized thoughts into structured, executable tasks with production-quality implementation plans. This MCP server implements the Sequential Prompting Framework for AI agents.

## 📋 Simple Installation

Add this to your `.cursor/mcp.json` file:

```json
"tanukimcp-thought": {
  "command": "npx",
  "args": ["@applejax2/tanukimcp-thought@latest"]
}
```

That's it! Your AI agent now has access to the Sequential Prompting Framework tools.

## 🔍 What is the Sequential Prompting Framework?

The Sequential Prompting Framework is a structured approach to working with AI agents, breaking down the process into three key phases:

1. **Capture & Organize** - Transform scattered thoughts into a structured todolist
2. **Enhance & Refine** - Add production-quality details to each task
3. **Implement Tasks** - Execute one task at a time with clear standards

## 🛠️ Available Tools

### Phase 1: Brain Dump & Organization

```
brain_dump_organize
```

Transform unstructured thoughts into a structured markdown todolist.

### Phase 2: Enhance & Refine

```
enhance_todolist
```

Add detailed specifications, acceptance criteria, and technical requirements.

### Phase 3: Sequential Task Implementation

```
find_next_task
plan_task_implementation
mark_task_complete
```

Find, plan, and implement tasks in a logical sequence.

### Auxiliary Tools

```
sequential_thinking
```

Break down complex problems with a structured thinking process.

## 🔄 Example Workflow

1. **Organize thoughts into tasks**:
   ```
   I want to organize my thoughts about my new app using brain_dump_organize.
   Project description: "A collaborative task management app"
   Unstructured thoughts:
   - User authentication
   - Task creation and assignment
   - Real-time updates
   - Mobile responsive interface
   ```

2. **Enhance with specifications**:
   ```
   Now enhance the todolist with detailed specifications using enhance_todolist.
   Input file: tooltodo.md
   ```

3. **Find next task**:
   ```
   What should I work on next? Use find_next_task.
   Todolist file: tooltodo.md
   ```

4. **Plan implementation**:
   ```
   Create an implementation plan for "Set up authentication" using plan_task_implementation.
   Task: Set up authentication
   Todolist file: tooltodo.md
   ```

5. **Mark task complete**:
   ```
   I've completed "Set up authentication". Mark it as complete using mark_task_complete.
   Task: Set up authentication
   Todolist file: tooltodo.md
   ```

## 🚀 Advanced Installation Options

### Direct Usage with npx

```bash
npx @applejax2/tanukimcp-thought
```

### Global Installation

```bash
npm install -g @applejax2/tanukimcp-thought
tanukimcp-thought
```

### HTTP Server Mode

```bash
npx @applejax2/tanukimcp-thought http
```

Then connect to `http://localhost:3001/sse`

## 🔌 Integration with Other MCP Servers

This MCP server works great alongside:

- **Desktop Commander** - For file and system operations
- **LotusWisdomMCP** - For deep thinking sessions
- **Memory Tools** - To maintain context between sessions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎓 Based on the Sequential Prompting Framework

The concepts in this MCP server implement the Sequential Prompting Framework methodology for transforming unstructured thoughts into structured, executable tasks with clear implementation plans.

## 🔍 Overview

This MCP server implements the Sequential Prompting Framework, which operates in three distinct phases:

1. **Capture & Organize** - Transform scattered thoughts into a structured todolist
2. **Enhance & Refine** - Add production-quality details to each task
3. **Implement Tasks** - Execute one task at a time with clear standards

Each phase is implemented as a set of callable MCP tools that can be used in various AI environments like Cursor, Claude Desktop, or any other platform that supports MCP.

## 📋 Features

- **Brain Dump & Organization** - Transform unstructured thoughts into structured todolists
- **Task Enhancement** - Add detailed specifications and acceptance criteria to tasks
- **Sequential Implementation** - Find, plan, and implement tasks in a logical order
- **Sequential Thinking** - Break down complex problems using structured thinking
- **Local-First** - All processing happens locally, ensuring privacy and control
- **Standardized Approach** - Consistent formatting and structure across projects

## 🚀 Installation

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Setting Up the Server

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/tanuki-sequential-thought-mcp.git
   cd tanuki-sequential-thought-mcp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## 🔧 Running the Server

The MCP server can run in two modes:

### Stdio Mode (Command Line)

This mode is ideal for local use with tools like Cursor IDE:

```
npm start
```

For development with auto-reload:

```
npm run dev
```

### HTTP Mode (Web)

This mode is useful for sharing the server across different applications:

```
npm run start:http
```

For development with auto-reload:

```
npm run dev:http
```

By default, the HTTP server runs on port 3001. You can change this by setting the PORT environment variable:

```
PORT=8080 npm run start:http
```

## 🔌 Connecting to the Server

### In Cursor IDE

1. Open Cursor and go to Settings (gear icon)
2. Click on "Features" in the left sidebar
3. Scroll down to "MCP Servers" section
4. Click "Add new MCP server"
5. Enter these details:
   - Server name: `tanuki-sequential-thought`
   - For stdio mode:
     - Type: `command`
     - Command: The path to your server executable, e.g., `npm start`
   - For HTTP mode:
     - Type: `url`
     - URL: `http://localhost:3001/sse`
6. Click "Save"

### In Claude Desktop

1. Open Claude Desktop settings
2. Navigate to the MCP section
3. Add a new MCP server with:
   - Name: `tanuki-sequential-thought`
   - URL: `http://localhost:3001/sse` (for HTTP mode)
   - Or command path for local execution

### Using mcp.json with Cursor

For a more portable configuration, create an `.cursor/mcp.json` file in your project's root directory:

```json
{
  "mcpServers": {
    "tanuki-sequential-thought": {
      "command": "npm",
      "args": [
        "start"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    },
    "tanuki-sequential-thought-http": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

## 🔄 Workflow Example

Here's a sample workflow using the Sequential Thought MCP tools:

1. **Brain Dump & Organize**:
   ```
   I want to organize my thoughts on building a task management app using the brain_dump_organize tool.
   Project description: "A collaborative task management application for remote teams"
   Unstructured thoughts: 
   - User authentication
   - Task creation, editing, deletion
   - Task assignment to team members
   - Due dates and reminders
   - Team chat functionality
   - Activity feed
   - React frontend, Firebase backend
   - Mobile responsive design
   ```

2. **Enhance & Refine**:
   ```
   Let's enhance the todolist with more detailed specifications using enhance_todolist.
   The input file is "tooltodo.md".
   ```

3. **Find Next Task**:
   ```
   What task should I work on next? Please use find_next_task.
   The todolist file is "tooltodo.md".
   ```

4. **Plan Task Implementation**:
   ```
   I want to plan the implementation of "Set up user authentication with Firebase" using plan_task_implementation.
   The todolist file is "tooltodo.md".
   ```

5. **Implement Task and Mark Complete**:
   After implementing the task based on the plan:
   ```
   I've completed "Set up user authentication with Firebase". Let's mark it as complete using mark_task_complete.
   The todolist file is "tooltodo.md".
   ```

6. Repeat steps 3-5 until all tasks are complete.

## 🙏 Acknowledgements

- Based on the Sequential Prompting Framework
- Built using the FastMCP framework
- Inspired by community innovations in the MCP ecosystem 