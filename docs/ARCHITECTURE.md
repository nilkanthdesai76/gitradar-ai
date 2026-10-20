# ARCHITECTURE.md — GitRadar AI System Architecture

> Structural architecture, state machines, process communication, and data flow pipelines for GitRadar AI.

---

## 🏗️ 1. Complete System Architecture

```mermaid
flowchart TD
    subgraph ClientInterfaces["CLI & Tool Integrations"]
        CLI["CLI Command Runner\n(Commander.js / bin/gitradar-ai.js)"]
        ExternalAgent["AI Assistants\n(Claude Code, Cursor, Antigravity)"]
    end

    subgraph MCPBridge["Model Context Protocol Layer"]
        MCPServer["MCP Server (JSON-RPC 2.0)\n(@modelcontextprotocol/sdk)"]
        StdioTransport["stdio Transport\n(stdin / stdout stream)"]
        SSETransport["SSE Transport\n(HTTP POST / EventSource)"]
    end

    subgraph CoreEngine["Autonomous Agent Controller"]
        LoopController["Autonomous Loop Controller\n(Bounded 5-iteration state machine)"]
        SafetyEngine["Git Safety & Stash Manager\n(Atomic rollback checkpoints)"]
        DiffPatcher["Surgical Diff Patcher\n(AST & line-range replacement)"]
        ErrorExtractor["Multi-Language Diagnostic Parser\n(Swift, Node, Python, Rust, Go)"]
    end

    subgraph LocalInference["Apple Silicon Local AI Runtime"]
        OllamaConnector["Ollama HTTP Bridge\n(http://127.0.0.1:11434/api/generate)"]
        MLXConnector["Apple MLX Metal Bridge\n(Low-latency unix socket)"]
        LocalModel["Qwen 2.5 Coder 7B\n(Metal Performance Shaders / MPS)"]
    end

    subgraph GitWorkspaces["Local File System Workspaces"]
        TargetRepo["Target Git Working Tree\n(e.g. ~/Work/My/Notchy)"]
        PackfileEngine["Git Packfile Analyzer\n(git verify-pack & rev-list)"]
    end

    CLI --> LoopController
    ExternalAgent <--> StdioTransport
    ExternalAgent <--> SSETransport
    StdioTransport --> MCPServer
    SSETransport --> MCPServer
    MCPServer --> LoopController

    LoopController --> SafetyEngine
    LoopController --> ErrorExtractor
    LoopController --> OllamaConnector
    LoopController --> MLXConnector
    LoopController --> DiffPatcher

    OllamaConnector --> LocalModel
    MLXConnector --> LocalModel

    SafetyEngine <--> TargetRepo
    DiffPatcher --> TargetRepo
    ErrorExtractor --> TargetRepo
    LoopController --> PackfileEngine
    PackfileEngine --> TargetRepo
```

---

## 🔄 2. Autonomous Loop State Machine

The loop controller implements a finite state machine with strict termination bounds:

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> SnapshotSafety: fix command initiated
    SnapshotSafety --> RunTests: Stash / checkpoint created
    
    state RunTests {
        [*] --> ExecutingSubprocess
        ExecutingSubprocess --> CheckExitCode
    }

    CheckExitCode --> Success: Exit Code == 0
    CheckExitCode --> ParseDiagnostic: Exit Code != 0

    state ParseDiagnostic {
        [*] --> RegexMatch
        RegexMatch --> IdentifyFileSpan
        IdentifyFileSpan --> ReadSurroundingContext
    }

    ParseDiagnostic --> PromptLocalLLM: Error Context Ready
    
    state PromptLocalLLM {
        [*] --> ConstructXML
        ConstructXML --> StreamQwenTokens
        StreamQwenTokens --> ValidateJSONSchema
    }

    PromptLocalLLM --> ApplyPatch: Valid JSON Patch
    PromptLocalLLM --> IncrementIteration: Invalid JSON / Model Error

    state ApplyPatch {
        [*] --> LineRangeSlice
        LineRangeSlice --> OverwriteDisk
    }

    ApplyPatch --> IncrementIteration
    
    IncrementIteration --> RunTests: iteration < max_iterations
    IncrementIteration --> RollbackWorkspace: iteration >= max_iterations

    RollbackWorkspace --> Failure: Workspace restored cleanly
    Success --> [*]: All tests passing
    Failure --> [*]: Exited with failure report
```

---

## 🛡️ 3. Atomic Stash & Rollback Protocol

To guarantee that autonomous repairs never leave user code in a corrupted state:

1. **Pre-flight Snapshot**:
   ```bash
   # Capture current SHA and unstaged diff
   git rev-parse HEAD > .gitradar_base_sha
   git diff > .gitradar_safety_diff
   # Create detached stash without altering working tree
   STASH_ID=$(git stash create "gitradar-ai pre-fix backup")
   ```
2. **Iteration Checkpoint**:
   - Each automated edit records the target file and original lines in `.gitradar_history.json`.
3. **Rollback Execution**:
   - If tests fail to converge within `max_iterations`, the engine restores the original state:
   ```bash
   git checkout -- .
   git clean -fd
   if [ -n "$STASH_ID" ]; then
       git stash apply "$STASH_ID"
   fi
   ```

---

## 🔌 4. Local Model Connector (Ollama & MLX)

GitRadar AI interfaces directly with local models via streaming JSON:

```typescript
export interface LocalModelRequest {
  model: string;          // e.g. "qwen2.5-coder:7b"
  prompt: string;
  systemPrompt: string;
  temperature: number;    // default: 0.1 for deterministic repairs
  maxTokens: number;      // default: 2048
}

export async function promptQwen(request: LocalModelRequest): Promise<string> {
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: request.model,
      prompt: request.prompt,
      system: request.systemPrompt,
      stream: false,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        num_thread: 8 // Utilize 8 performance cores on M2 Pro
      }
    })
  });
  
  const data = await response.json();
  return data.response;
}
```
