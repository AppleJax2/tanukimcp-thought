# Tanuki Sequential Thought MCP

A locally-run sequential thinking MCP server based on the Sequential Prompting Framework. This MCP server provides tools to transform disorganized thoughts into structured, executable tasks with production-quality implementation plans.

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

## 🛠️ Available Tools

### Phase 1: Brain Dump & Organization

#### `brain_dump_organize`

Transforms unstructured thoughts into a structured markdown todolist.

Parameters:
- `project_description`: Brief description of the project
- `unstructured_thoughts`: Unstructured thoughts, ideas, and considerations
- `output_file`: (Optional) File path to save the todolist (default: tooltodo.md)

Example usage:
```
I want to use the brain_dump_organize tool to organize my thoughts about building a CRM system. 
My project description is "A customer relationship management system for small businesses."
My unstructured thoughts are:
- User authentication and role-based access control
- Dashboard with key metrics 
- Customer profile management 
- Email integration
- React/Next.js frontend, Node.js backend
- MongoDB for data storage
```

### Phase 2: Enhance & Refine

#### `enhance_todolist`

Enhances an existing todolist with more detailed specifications, acceptance criteria, and technical requirements.

Parameters:
- `input_file`: Path to the existing todolist file
- `output_file`: (Optional) Path to save the enhanced todolist

Example usage:
```
Now I'd like to enhance my todolist with more detailed specifications using the enhance_todolist tool. 
The input file is "tooltodo.md".
```

### Phase 3: Sequential Task Implementation

#### `find_next_task`

Identifies the next logical unchecked task to implement from the todolist.

Parameters:
- `todolist_file`: Path to the todolist file

Example usage:
```
Let's identify the next task to implement using the find_next_task tool.
The todolist file is "tooltodo.md".
```

#### `plan_task_implementation`

Creates a detailed implementation plan for a specific task.

Parameters:
- `task`: The task to plan implementation for
- `todolist_file`: Path to the todolist file for context

Example usage:
```
I want to plan the implementation of the task "Set up user authentication" using the plan_task_implementation tool.
The todolist file is "tooltodo.md".
```

#### `mark_task_complete`

Marks a specific task as complete in the todolist.

Parameters:
- `task`: The task text to mark as complete
- `todolist_file`: Path to the todolist file

Example usage:
```
I've completed the task "Set up user authentication" and want to mark it as complete using the mark_task_complete tool.
The todolist file is "tooltodo.md".
```

### Auxiliary Tools

#### `sequential_thinking`

Applies the sequential thinking process to break down a complex problem.

Parameters:
- `problem`: The complex problem or question to analyze
- `steps`: (Optional) Number of thinking steps to perform (default: 3)

Example usage:
```
I need help breaking down the problem "How to design a scalable microservice architecture" using the sequential_thinking tool.
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

## 🤝 Integration with Other MCP Servers

This MCP server can be used alongside other MCP servers for enhanced capabilities:

- **Memory Tools**: Use with memory servers like `@mem0ai/mem0-memory-mcp` or `@upstash/context7-mcp` to maintain context between sessions
- **Research Tools**: Combine with search servers like `exa` or `@nickclyde/duckduckgo-mcp-server` for information gathering
- **Development Tools**: Pair with `@wonderwhy-er/desktop-commander` or `@smithery-ai/github` for implementation tasks

### Desktop Commander Integration

Desktop Commander is particularly powerful when combined with Tanuki Sequential Thought MCP. Here's how to use them together effectively:

1. **Project Setup**:
   ```
   I need to set up a new project for [PROJECT DESCRIPTION]. First, let's create a structured todolist using the brain_dump_organize tool.
   ```

2. **File Management with Desktop Commander**:
   ```
   Now that I have my todolist in tooltodo.md, let's create the project structure using Desktop Commander.
   DC: create_directory("/path/to/project/src")
   DC: create_directory("/path/to/project/docs")
   ```

3. **Task Implementation**:
   ```
   Let's identify the next task using find_next_task.
   [After getting the task]
   Now let's plan this task with plan_task_implementation.
   [After getting the plan]
   Let's implement this using Desktop Commander:
   DC: write_file("/path/to/project/src/component.js", "// Code here")
   ```

4. **Code Search and Modification**:
   ```
   Let's search for patterns in our codebase:
   DC: search_code("/path/to/project", "functionName")
   
   Now let's modify the code:
   DC: edit_block("/path/to/project/src/file.js", "old code", "new code")
   ```

5. **Mark Task Complete**:
   ```
   Now that we've implemented the task, let's mark it complete using mark_task_complete.
   ```

This workflow combines the structured task management of Tanuki Sequential Thought MCP with the filesystem and code manipulation capabilities of Desktop Commander.

### LotusWisdomMCP Integration

For complex problem-solving scenarios, combining Tanuki Sequential Thought MCP with LotusWisdomMCP creates a powerful thinking environment:

1. **Initial Problem Breaking**:
   ```
   I have a complex problem: [PROBLEM DESCRIPTION]. Let's use LotusWisdomMCP to break this down.
   ```

2. **Task Structure Creation**:
   ```
   Based on this analysis, let's create a structured todolist using brain_dump_organize.
   ```

3. **Deep Thinking on Tasks**:
   ```
   For this particular task, I need deeper analysis. Let's use LotusWisdomMCP again to explore different approaches.
   ```

4. **Implementation Planning**:
   ```
   Now that we have clarity, let's use plan_task_implementation to create a concrete plan.
   ```

This combination helps bridge the gap between abstract problem-solving and concrete task implementation.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Based on the Sequential Prompting Framework
- Built using the FastMCP framework
- Inspired by community innovations in the MCP ecosystem 