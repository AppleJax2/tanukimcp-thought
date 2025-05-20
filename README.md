# Tanuki Sequential Thought MCP

Transform disorganized thoughts into structured, executable tasks with production-quality implementation plans. This MCP server implements the Sequential Prompting Framework for AI agents.

## 📋 Installation

### Prerequisites

1. **Install [Ollama](https://ollama.ai/)**
   
   Ollama is required to run language models locally. Download and install from:
   - **Mac**: [ollama.ai](https://ollama.ai/)
   - **Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`
   - **Windows**: [Windows installer](https://ollama.ai/)

2. **Install a compatible language model**

   This MCP uses [DeepSeek-R1](https://ollama.com/library/deepseek-r1) by default, but you can configure it to use other reasoning models:
   
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

3. **Install the MCP Server**

   Go to [smithery.ai/server/@AppleJax2/tanukimcp-thought](https://smithery.ai/server/@AppleJax2/tanukimcp-thought) and use the auto-install command, or manually add this to your `.cursor/mcp.json` file:

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

Each phase builds upon the previous one, creating a workflow that maintains context and ensures high-quality results. This framework is applicable to projects of any scale - from small refactors to building entire applications from scratch.

## 🛠️ Available Tools

### Phase 1: Brain Dump & Organization

```
brain_dump_organize
```

Transform unstructured thoughts into a structured markdown todolist. This tool uses a local LLM to analyze your input and create an organized todolist with logical categories.

### Phase 2: Enhance & Refine

```
enhance_todolist
```

Add detailed specifications, acceptance criteria, and technical requirements to your todolist. The LLM analyzes your existing tasks and enhances them with implementation details.

### Phase 3: Sequential Task Implementation

```
find_next_task
plan_task_implementation
mark_task_complete
task_executor
```

Find, plan, implement, and track tasks in a logical sequence:

- **find_next_task** - Identifies the most logical next task to implement based on dependencies
- **plan_task_implementation** - Creates a detailed implementation plan for a specific task
- **task_executor** - Actually implements the task by performing the necessary file operations
- **mark_task_complete** - Updates the todolist to mark a task as complete

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

5. **Execute the task**:
   ```
   Execute the planned task using task_executor.
   Task: Set up authentication
   Todolist file: tooltodo.md
   Target directory: ./src
   ```

6. **Mark task complete** (optional, as task_executor does this automatically on success):
   ```
   I've completed "Set up authentication". Mark it as complete using mark_task_complete.
   Task: Set up authentication
   Todolist file: tooltodo.md
   ```

## 🚀 Advanced Configuration

### Customizing the Language Model

You can customize the model by creating a `tanuki-config.json` file in your project:

```json
{
  "llmModel": "deepseek-r1"
}
```

Replace "deepseek-r1" with any compatible Ollama model you've installed.

## 🧠 LLM Integration

This MCP uses local language models through Ollama to provide intelligent processing of your thoughts and tasks:

1. Your unstructured thoughts are analyzed and organized into logical categories
2. Todolist items are enhanced with detailed specifications and implementation considerations
3. Tasks are prioritized based on dependencies and logical order
4. Implementation plans are created with step-by-step instructions
5. The task executor translates plans into concrete file operations

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