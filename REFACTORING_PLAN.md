# Refactoring Plan for Tanuki MCP

---
**AI Agent Implementation Note (as of 5-22-25):**
- All code and logic must meet production quality standards—no placeholder, sample, or simplified logic is permitted.
- Every tool, utility, and server component must be implemented fully and robustly, as if shipping to production.
- Do not use sample or stub implementations; ensure all logic is complete, tested, and ready for real-world use.
- Use web search as needed to ensure all server configuration, dependencies, and best practices are up to date as of today (5-22-25).
- Review and validate all code for maintainability, security, and performance before considering a task complete.
---

## Current Issues

1. **Monolithic Structure**: The current `server.ts` file is over 2000 lines long, making it difficult to maintain and causing tool scanning issues.
2. **Rule-based Fallbacks**: The current implementation has rule-based fallbacks instead of fully leveraging the IDE's built-in LLMs.
3. **Deployment Complexity**: The current implementation supports multiple modes (http, stdio) which adds complexity for Smithery deployment.

## File Structure Refactoring

### 1. Create a modular directory structure ✅

```
src/
├── index.ts           # Main entry point ✅
├── server.ts          # Core server setup (minimal) ✅
├── config/            # Configuration ✅
│   ├── index.ts       # Configuration exports ✅
│   └── default.ts     # Default config ✅
├── utils/             # Shared utilities ✅
│   ├── index.ts       # Utility exports ✅
│   ├── file-utils.ts  # File operations ✅
│   ├── path-utils.ts  # Path resolution ✅
│   └── llm-utils.ts   # LLM integration ✅
├── tools/             # Individual tools ✅
│   ├── index.ts       # Tool registration ✅
│   ├── brain-dump.ts  # Brain dump tool ✅
│   ├── enhance-todo.ts # Enhance todolist tool ✅
│   ├── task-finder.ts # Find next task tool ✅
│   ├── task-planner.ts # Plan task implementation tool ✅
│   ├── task-executor.ts # Execute task implementation tool ✅
│   ├── task-completer.ts # Mark task complete tool ✅
│   ├── file-ops/      # File operation tools ✅
│   │   ├── index.ts   # File operation tool registration ✅
│   │   ├── create-file.ts ✅
│   │   ├── edit-file.ts ✅
│   │   ├── delete-file.ts ✅
│   │   ├── move-file.ts ✅
│   │   ├── copy-file.ts ✅
│   │   ├── directory-ops.ts ✅
│   │   └── batch-ops.ts ✅
│   └── types.ts       # Shared tool types ✅
└── context/           # Project context management ✅
    ├── index.ts       # Context exports ✅
    └── project-manager.ts # Project context manager ✅
```

### 2. Refactoring Steps

1. **Create Base Structure** ✅:
   - Set up the directory structure ✅
   - Move common utilities to their appropriate files ✅

2. **Extract Project Context Manager** ✅:
   - Move `ProjectContextManager` to `src/context/project-manager.ts` ✅
   - Export it through `src/context/index.ts` ✅

3. **Extract Utility Functions** ✅:
   - Move path resolution to `src/utils/path-utils.ts` ✅
   - Move file operations to `src/utils/file-utils.ts` ✅
   - Move LLM integration to `src/utils/llm-utils.ts` ✅

4. **Extract Tools One by One** ✅:
   - Core sequential thinking tools ✅
     - Brain dump tool ✅
     - Enhance todolist tool ✅
     - Find next task tool ✅
     - Plan task implementation tool ✅
     - Execute task implementation tool ✅
     - Mark task complete tool ✅
   - File operation tools ✅
     - Create file tool ✅
     - Edit file tool ✅
     - Delete file tool ✅
     - Move file tool ✅
     - Copy file tool ✅
     - Directory operations tools ✅
     - Batch operations tool ✅

5. **Update Server Core** ✅:
   - Keep `server.ts` minimal, focused on server setup ✅
   - Import and register tools from the tools directory ✅

6. **Remove HTTP Support** ✅:
   - Delete http.ts and related components ✅
   - Update package.json to remove HTTP-related scripts ✅
   - Update bin script to support stdio mode exclusively ✅
   - Optimize for Smithery deployment ✅

7. **Update Entry Point** ✅:
   - Update `index.ts` to use the new modular structure ✅
   - Add Smithery deployment optimizations ✅

### 3. LLM Integration ✅

1. **Create a dedicated LLM service** ✅:
   - Implement in `src/utils/llm-utils.ts` ✅
   - Remove all rule-based fallbacks ✅
   - Ensure all tools rely exclusively on the IDE's built-in LLM ✅

2. **Update all tools to use the LLM service** ✅:
   - Remove fallback mechanisms ✅
   - Throw errors if LLM operations fail ✅
   - Remove any local LLM options ✅

### 4. Smithery Deployment Optimization ✅

1. **Optimize for tool scanning** ✅:
   - Ensure files are small and focused ✅
   - Add environment variables for quick startup ✅
   - Set flags for Smithery compatibility ✅

2. **Focus on stdio mode** ✅:
   - Remove HTTP support entirely ✅
   - Update bin script to only support stdio mode ✅
   - Ensure configuration is optimized for hosted deployment ✅

## Implementation Plan

1. ✅ Start with creating the directory structure and moving utility functions
2. ✅ Extract the ProjectContextManager
3. ✅ Implement the LLM service
4. ✅ Extract tools one by one, starting with simpler ones 
5. ✅ Remove HTTP support and focus on stdio mode
6. ✅ Add Smithery deployment optimizations
7. ✅ Update the server.ts file to use the modular structure
8. ✅ Test thoroughly after each step

## Expected Benefits

1. **Improved Maintainability**: Smaller, focused files are easier to understand and modify ✅
2. **Better Tool Scanning**: Smaller files load faster and are processed more efficiently ✅
3. **Enhanced LLM Integration**: Direct reliance on IDE's LLM capabilities ✅
4. **Easier Extension**: New tools can be added without modifying existing code ✅
5. **Better Testability**: Components can be tested in isolation ✅
6. **Smithery Compatibility**: Optimized for deployment on Smithery as a hosted stdio MCP server ✅
7. **Simplified Codebase**: Removing HTTP support reduces complexity and maintenance burden ✅

## Conclusion

The refactoring plan has been fully implemented. The Tanuki MCP now features:

- A modular, maintainable code structure with focused components
- Full integration with the IDE's built-in LLM capabilities
- Complete production-quality implementation of all tools
- Robust error handling, security measures, and input validation
- Optimized configuration for Smithery deployment
- Simplified architecture focused on stdio mode only
- Clear separation of concerns with proper abstraction layers

All code has been implemented to production quality standards with comprehensive error handling and validation. The system is now more maintainable, extensible, and optimized for performance and tool scanning. 