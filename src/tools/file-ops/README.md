# File Operations Tools

This directory contains the implementations of all file operation tools for the Tanuki MCP.

## Tools to Implement

The following tools need to be implemented according to the refactoring plan:

1. **create-file.ts** - Tool for creating new files ✅
2. **edit-file.ts** - Tool for editing existing files ✅
3. **delete-file.ts** - Tool for deleting files ✅
4. **move-file.ts** - Tool for moving files between locations ✅
5. **copy-file.ts** - Tool for copying files between locations ✅
6. **directory-ops.ts** - Tools for directory operations (create, list, delete) ✅
7. **batch-ops.ts** - Tool for executing multiple file operations in a batch ✅
8. **index.ts** - Tool registration for all file operation tools ✅

## Implementation Status

- [x] create-file.ts
- [x] edit-file.ts
- [x] delete-file.ts
- [x] move-file.ts
- [x] copy-file.ts
- [x] directory-ops.ts
- [x] batch-ops.ts
- [x] index.ts

## Implementation Notes

- Each tool uses the utility functions from `src/utils/file-utils.ts`
- All paths are resolved using functions from `src/utils/path-utils.ts`
- All tools follow the same pattern as the core sequential thinking tools
- Proper error handling and validation of inputs is implemented
- All tools support the `workspace_root` parameter
- Critical system paths are protected to prevent dangerous operations
- Backup functionality is available for destructive operations

## Features

- **Path Resolution**: All file paths are properly resolved relative to the workspace root
- **Security**: Critical system paths are protected from modification
- **Error Handling**: Robust error handling with clear error messages
- **Validation**: Input validation to prevent incorrect or dangerous operations
- **Backups**: Automatic backups for destructive operations
- **Batch Operations**: Support for executing multiple operations in a batch
- **Dry Run Mode**: Preview operations without executing them 