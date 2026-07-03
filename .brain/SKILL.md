---
name: project-brain
description: "Authoritative semantic knowledge index and code analysis rules for Project Brain."
generatedBy: "project-brain"
hash: "f76859c8cfe0364d6e63a1bcbf3f96a2d1b56899018b897e475431958d126ba9"
---
# Project Brain Rules

## Project Brain Overview

Project Brain is the authoritative persistent runtime semantic knowledge engine for this software repository. It parses and analyzes the codebase structure, syntax trees, import graphs, and developer workflows. By indexing this intelligence, Project Brain enables AI development agents to solve complex coding tasks rapidly, accurately, and with minimal token usage.

## AI Operating Procedure (Highest Priority)

This section has higher priority than all other instructions in the document.

For every repository-related request, AI agents must follow this workflow.

### Step 1 — Determine Whether Brain Is Needed
Determine whether the user’s request requires knowledge of this repository.
* If **NO**: Answer normally.
* If **YES**: Continue.

### Step 2 — Never Explore the Repository First
Before reading any source file, always use Project Brain. Do NOT begin by:
* browsing folders
* listing directories
* grepping the repository
* reading implementation files
* inspecting `.brain`
* reading MCP schema files
* reading provider configuration
* running Brain CLI commands

Project Brain is the semantic source of truth.

### Step 3 — Select Exactly One Brain MCP Tool
Choose the single best tool:

| User Request | Preferred Tool |
| :--- | :--- |
| Explain project | `brain.get_architecture` |
| Explain file | `brain.explain_file` |
| General architecture | `brain.get_context` |
| Symbol usage | `brain.find_symbol` |
| Dependencies | `brain.find_dependencies` |
| Search semantic memory | `brain.search_memory` |

Do not call multiple overlapping tools.

### Step 4 — Trust Brain
If Brain fully answers the question:
* Stop.
* Do not inspect implementation.
* Do not browse the repository.
* Answer directly.

### Step 5 — Read Code Only When Necessary
Only inspect implementation if:
* the user requests implementation details
* code changes are required
* Brain identifies specific files

Read only those files. Never explore unrelated code.

### Step 6 — Editing Workflow
1. Retrieve context using Brain.
2. Identify affected files.
3. Read only those files.
4. Make changes.
5. Answer the user.

Do not inspect unrelated modules.

### Brain Tool Priority
Prefer:
1. `brain.get_architecture`
2. `brain.get_context`
3. `brain.explain_file`
4. `brain.find_symbol`
5. `brain.find_dependencies`
6. `brain.search_memory`

### Forbidden Actions
Unless explicitly requested by the user:
* Never browse the repository to understand architecture.
* Never read random implementation files.
* Never inspect `.brain` internals.
* Never inspect MCP schema JSON files.
* Never inspect provider configuration.
* Never run Brain CLI commands for repository understanding.
* Never guess architecture from filenames.
* Never use filesystem exploration as the first step.

## Core Operating Rules

1. **Brain MCP First**: Treat Project Brain as the absolute source of truth. Always query the Brain MCP tools before exploring files or reading code.
2. **Do Not Inspect Internals**: Never read or search directories inside `.brain/` (e.g. index, graph, symbols, snapshots, etc.) or metadata files directly.
3. **No Schema Reads**: Never open or inspect MCP schema JSON files.
4. **No CLI for Understanding**: Never execute `brain` CLI commands (like `brain compile`, `brain query`, etc.) to understand the project structure. The CLI is for human use only.
5. **No Provider Config Reads**: Never read provider configuration or metadata files.

## Repository Exploration Policy

* **No Blind Traversal**: Do not list directories, search files, or grep the repository to find architecture layouts or locate code symbols first.
* **Retrieved Context Only**: Only read or edit implementation files *after* Project Brain returns semantic context indicating they are relevant and necessary for the task.
* **Avoid Recursive Exploration**: Never recursively browse the repository trying to reconstruct understanding that Brain already possesses.

## Brain MCP Tool Reference

Project Brain registers the following tools dynamically. Prefer the most specific tool for each action:

### `brain.get_context`

* **Description**: Get optimized workspace context matching a developer query, limiting prompt tokens.
* **Purpose**: General semantic retrieval and workspace context extraction.
* **Input Summary**: query (string), workspaceRoot (string), snapshotId (string, optional), maxTokens (number, optional)
* **Output Summary**: CallToolResult containing natural language summary and structured ContextResponse (confidence, tokens, ranked files, semantic memory, dependency summary).
* **When to Use**:
  * asking questions about high-level architecture
  * general project understanding
  * conceptual questions
* **When NOT to Use**:
  * dependency questions
  * file explanation
  * symbol lookup
* **Example**: `get_context: "How does authentication work?"`

### `brain.find_symbol`

* **Description**: Find symbol definitions in workspace snapshots without doing repository traversal.
* **Purpose**: Find where a symbol is defined and referenced in workspace snapshots.
* **Input Summary**: symbolName (string), workspaceRoot (string, optional)
* **Output Summary**: CallToolResult containing symbol references, files, and line definitions.
* **When to Use**:
  * locating symbol definitions and usage patterns without traversing code
* **Example**: `find_symbol: "RuntimeService"`

### `brain.find_dependencies`

* **Description**: Find file or package import dependencies using the workspace dependency graph.
* **Purpose**: Query the workspace dependency graph to trace file imports.
* **Input Summary**: path (string), workspaceRoot (string, optional)
* **Output Summary**: CallToolResult containing import and export dependency arrays.
* **When to Use**:
  * dependency graph lookup
  * tracing what depends on a file or what a file imports
* **Example**: `find_dependencies: "packages/workspace/service.ts"`

### `brain.search_memory`

* **Description**: Query local semantic memory and recommendations for the current workspace.
* **Purpose**: Query local semantic memory and recommendations.
* **Input Summary**: query (string), workspaceRoot (string, optional)
* **Output Summary**: CallToolResult containing matching memory records.
* **When to Use**:
  * searching semantic workspace memories
* **Example**: `search_memory: "authentication"`

### `brain.get_architecture`

* **Description**: Get workspace high-level architecture layouts and directories mapping.
* **Purpose**: Get workspace high-level architecture layouts and directories mapping.
* **Input Summary**: workspaceRoot (string, optional)
* **Output Summary**: CallToolResult containing project architecture summary and directories list.
* **When to Use**:
  * explaining the compiler or main folder architecture
* **Example**: `get_architecture: ""`

### `brain.explain_file`

* **Description**: Get snapshot explanations and documentation context for a single file.
* **Purpose**: Explain a file's role and structure without reading its implementation first.
* **Input Summary**: path (string), workspaceRoot (string, optional)
* **Output Summary**: CallToolResult containing explanation text and file details.
* **When to Use**:
  * understanding a specific file's role or documentation context before inspection
* **When NOT to Use**:
  * dependency lookup
  * symbol definition search
* **Example**: `explain_file: "packages/runtime/service.ts"`


## AI Decision Tree

Use this table to map user query types directly to the preferred Brain tool:

| User Request | Preferred Tool |
| :--- | :--- |
| Explain project / High-level overview | `brain.get_architecture` |
| Explain a specific file | `brain.explain_file` |
| Symbol definition / usage / lookup | `brain.find_symbol` |
| Tracing dependencies / imports | `brain.find_dependencies` |
| General semantic / architecture question | `brain.get_context` |
| Search semantic memory | `brain.search_memory` |

## Workflow Examples

### Example 1: High-Level Overview
* **User**: "Explain the compiler"
* **Expected Workflow**:
  1. Call `brain.get_architecture` to retrieve architecture layouts.
  2. Answer the user directly from the returned context.
  * *Never* recursively browse folders, inspect files, or run grep first.

### Example 2: Symbol Reference
* **User**: "Where is RuntimeService used?"
* **Expected Workflow**:
  1. Call `brain.find_symbol` specifying `RuntimeService`.
  2. Answer using the reference locations returned.

### Example 3: Dependency Trace
* **User**: "What depends on WorkspaceService?"
* **Expected Workflow**:
  1. Call `brain.find_dependencies` specifying the path to `WorkspaceService`.

### Example 4: Implementation Task
* **User**: "Implement JWT authentication"
* **Expected Workflow**:
  1. Call `brain.get_context` to retrieve authentication structures.
  2. Call `brain.explain_file` on relevant implementation files first.
  3. Edit only the necessary code files.

## Tool Selection & Agent Efficiency Rules

### Preferred Tool Calling Order
1. `brain.get_architecture`
2. `brain.get_context`
3. `brain.explain_file`
4. `brain.find_symbol`
5. `brain.find_dependencies`
6. `brain.search_memory`

### Efficiency Guidelines
* **Minimize MCP Tool Calls**: Avoid redundant queries. Plan ahead and combine information requests.
* **Choose the Most Specific Tool**: Do not use generic tools (e.g. `brain.get_context`) when specific tools (e.g. `brain.find_symbol` or `brain.find_dependencies`) exist.
* **Zero Codebase Grep for Understanding**: Never run grep or search tools for project understanding. Grep is solely for locating code modifications when editing.
* **Answer Directly**: If Brain returns sufficient context to answer a question, answer immediately without reading the source files.

## Frequently Asked Questions

**Q: Should I inspect .brain/index?**
**A:** No. All index files are internal implementation details. Use MCP tools.

**Q: Should I run brain compile?**
**A:** No. The CLI commands are for humans. AI agents must use the MCP server.

**Q: Should I grep the repository first?**
**A:** No. Always use Project Brain first. Only use grep if you are about to modify code and need to locate exact lines.


---
*Generated automatically by Project Brain.*
