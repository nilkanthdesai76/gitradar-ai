# PRD.md — GitRadar AI (Autonomous Developer Agent & MCP Suite)

> Product Requirements Document for GitRadar AI: The local-first, privacy-guaranteed autonomous developer workstation powered by local LLMs (Qwen 2.5 Coder) and the Model Context Protocol (MCP).

---

## 🎯 1. Objective & Problem Statement

### The Problem
Modern software developers manage dozens of repositories across local workspaces. They constantly perform repetitive manual maintenance:
- Investigating test failures, cross-referencing stack traces with source files, and applying mechanical fixes.
- Writing high-quality, standardized conventional git commits for large, complex diffs.
- Identifying and cleaning up stale, merged branches and packfile bloat.
- Current cloud AI coding tools incur latency, require subscriptions, and leak proprietary IP to remote servers.

### The Solution
**GitRadar AI** is a 100% offline, local-first agentic developer CLI and MCP server that runs on Apple Silicon unified memory (M-series). Powered by **Qwen 2.5 Coder** (via local Ollama/MLX/llama.cpp), it executes autonomous test-and-repair loops, drafts semantic commits, prunes repository bloat, and exposes high-level repository tools to external AI coding assistants via the standardized **Model Context Protocol (MCP)**.

### Target Audience
Software engineers, iOS/macOS developers, open-source maintainers, and security-conscious enterprise teams who demand zero cloud data exfiltration.

### Success Metrics
- **Zero Cloud Leakage**: 100% of reasoning, diff analysis, and commits happen locally on device.
- **Inference Speed**: $\ge 40$ tokens/sec using Qwen 2.5 Coder 7B on Apple M2 Pro via Metal (MPS).
- **Autonomous Repair Rate**: $\ge 85\%$ first-pass resolution of mechanical syntax, lint, and unit test compilation errors.
- **Memory Footprint**: $< 5.5\text{ GB}$ VRAM consumption, leaving $\ge 10\text{ GB}$ system RAM free.

---

## 📋 2. Comprehensive CLI Specification

```bash
# Core execution syntax
gitradar-ai <command> [options]

# 1. Autonomous Repair Loop
gitradar-ai fix [path] [options]
  --runner <auto|swift|npm|pytest|cargo|go>  # Force specific test runner
  --max-iterations <number>                 # Max repair loops (default: 5)
  --model <model-name>                      # Local LLM tag (default: qwen2.5-coder:7b)
  --endpoint <url>                          # Local Ollama/MLX URL (default: http://127.0.0.1:11434)
  --no-rollback                             # Keep failed changes instead of rolling back
  --dry-run                                 # Generate patches without writing to disk

# 2. Semantic Committer
gitradar-ai commit [path] [options]
  --interactive, -i                         # Prompt [y/n/edit] before executing git commit (default: true)
  --all, -a                                 # Auto-stage all modified & untracked files before committing
  --style <conventional|gitmoji|summary>    # Commit formatting style (default: conventional)
  --scope <scope-name>                      # Optional conventional commit scope, e.g. feat(auth): ...

# 3. Model Context Protocol Server
gitradar-ai mcp [options]
  --transport <stdio|sse>                   # Transport protocol (default: stdio)
  --port <port>                             # Port for SSE transport (default: 4041)

# 4. Packfile & Bloat Audit
gitradar-ai audit [path] [options]
  --blob-threshold-mb <mb>                  # Flag binary blobs exceeding MB (default: 10)
  --prune-merged                            # Auto-prune local branches merged into main/master
  --prune-stashes                           # Interactive menu to drop dangling stashes older than 30 days
```

---

## 🔬 3. Multi-Language Error Parsing Engine

The `ErrorParser` module auto-detects and extracts structured failure context across 5 major ecosystems:

| Ecosystem | Trigger Command | Detection Invariant | Captured Context Schema |
| :--- | :--- | :--- | :--- |
| **Swift** | `swift test` / `xcodebuild` | `Package.swift` or `*.xcodeproj` | `filePath`, `lineNumber`, `column`, `errorMessage` (e.g., `error: cannot find 'foo' in scope`) |
| **Node.js** | `npm test` / `vitest` / `jest` | `package.json` | `failingTestName`, `stackTrace`, `diffExpected`, `diffReceived` |
| **Python** | `pytest` / `unittest` | `pyproject.toml` / `requirements.txt` | `testNodeId`, `exceptionType`, `assertionDetail`, `sourceLine` |
| **Rust** | `cargo test` | `Cargo.toml` | `errorCode` (e.g., `E0308`), `helpMessage`, `spanFilePath`, `spanLine` |
| **Go** | `go test ./...` | `go.mod` | `packagePath`, `testFunc`, `failureReason`, `sourceLocation` |

### Parsing Regular Expressions
```typescript
// Swift compiler error matcher: /path/file.swift:42:15: error: message
export const SWIFT_ERROR_REGEX = /^(?<file>[^:\n]+):(?<line>\d+):(?<col>\d+):\s+error:\s+(?<msg>.+)$/gm;

// TypeScript/Jest error matcher: FAIL src/utils.test.ts > suite > test name
export const JEST_FAIL_REGEX = /^\s*●\s+(?<suite>[^›]+)›\s+(?<test>.+)$/gm;

// Pytest assertion matcher: E   AssertionError: assert 1 == 2
export const PYTEST_ERROR_REGEX = /^(?<file>[^:\n]+):(?<line>\d+):\s+in\s+(?<func>\w+)\n(?<stack>[\s\S]+?)^E\s+(?<msg>.+)$/gm;
```

---

## 🧠 4. Prompt Engineering for Qwen 2.5 Coder

To guarantee deterministic, high-accuracy repairs from a 7B local model, prompts use strict XML delimiting and enforce unified diff format:

### Repair System Prompt
```markdown
You are an expert compiler diagnostic and code repair agent.
Your objective: fix the code error precisely with zero extraneous changes.

RULES:
1. Output ONLY a valid JSON object matching this schema:
{
  "targetFile": "string (relative path)",
  "explanation": "concise 1-sentence rationale",
  "replacementCode": "complete drop-in replacement for the target block",
  "startLine": number,
  "endLine": number
}
2. Preserve all existing indentation, comments, and unrelated functions.
3. Do NOT wrap output in markdown prose or conversation.
```

### Prompt Input Context Payload
```xml
<context>
  <repository_type>swift</repository_type>
  <failing_command>swift test</failing_command>
  <error_diagnostic>
    Sources/App/Service.swift:84:12: error: value of type 'User' has no member 'emailAddress'
  </error_diagnostic>
  <target_file_content path="Sources/App/Service.swift">
    80: func validateUser(user: User) -> Bool {
    81:     guard !user.name.isEmpty else { return false }
    82:     // Validate email format
    83:     let email = user.emailAddress
    84:     return email.contains("@")
    85: }
  </target_file_content>
  <reference_type_definition name="User">
    struct User: Sendable {
        let id: String
        let name: String
        let email: String // Note: property is named 'email', not 'emailAddress'
    }
  </reference_type_definition>
</context>
```

---

## 🔌 5. Model Context Protocol (MCP) Tool Schemas

When running as an MCP server (`gitradar-ai mcp`), GitRadar AI registers these 6 tools:

```json
[
  {
    "name": "gitradar_scan_workspaces",
    "description": "Discovers all git repositories within configured root paths, reporting ahead/behind status, uncommitted changes, and current branch.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "rootPath": { "type": "string", "description": "Base directory, e.g. ~/Work/My" },
        "maxDepth": { "type": "integer", "default": 3 }
      }
    }
  },
  {
    "name": "gitradar_get_diff",
    "description": "Returns unstaged and staged git diff for a specific repository.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repoPath": { "type": "string", "description": "Absolute path to git repo" },
        "staged": { "type": "boolean", "default": false }
      },
      "required": ["repoPath"]
    }
  },
  {
    "name": "gitradar_autonomous_fix",
    "description": "Runs the test suite of a repository and repairs failing code autonomously using local Qwen 2.5 Coder.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repoPath": { "type": "string", "description": "Absolute path to target repo" },
        "maxIterations": { "type": "integer", "default": 5 }
      },
      "required": ["repoPath"]
    }
  },
  {
    "name": "gitradar_generate_commit",
    "description": "Analyzes uncommitted changes in a repo and generates a high-quality conventional git commit.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repoPath": { "type": "string" },
        "autoCommit": { "type": "boolean", "default": false }
      },
      "required": ["repoPath"]
    }
  },
  {
    "name": "gitradar_find_large_blobs",
    "description": "Scans git packfiles to locate binary objects exceeding the specified megabyte threshold.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repoPath": { "type": "string" },
        "thresholdMB": { "type": "number", "default": 10 }
      },
      "required": ["repoPath"]
    }
  },
  {
    "name": "gitradar_prune_merged_branches",
    "description": "Safely prunes local branches that have been merged into the remote default branch.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repoPath": { "type": "string" },
        "dryRun": { "type": "boolean", "default": true }
      },
      "required": ["repoPath"]
    }
  }
]
```

---

## 🚫 6. Out of Scope (Non-Goals)
- No cloud account requirements, API keys, or remote telemetry.
- No auto-pushing to remote origin without explicit `--push` flag.
- No editing files outside the current Git working tree.
