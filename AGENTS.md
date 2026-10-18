# AGENTS.md — GitRadar AI Operational Manual

> Ground-truth invariants, verified build/test commands, and operating rules for AI coding assistants working in `gitradar-ai`.

---

## 🧭 1. Repository Overview
- **Project Name**: `gitradar-ai`
- **Core Purpose**: Local-first autonomous developer agent and Model Context Protocol (MCP) server powered by Qwen 2.5 Coder on Apple Silicon.
- **Primary Tech Stack**: TypeScript, Node.js 20+, `@modelcontextprotocol/sdk`, simple-git.
- **Runtime Environment**: macOS 14+ (Sonoma/Sequoia), Apple Silicon M-Series.

---

## ⚡ 2. Verified Execution Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist
npm run build

# Run unit tests
npm test

# Run single targeted test
npx vitest run tests/errorParser.test.ts

# Type-check without emitting
npm run typecheck

# Run local MCP server test client
node dist/bin/gitradar-ai.js mcp
```

---

## 🛡️ 3. Critical Invariants & Rules

1. **Local-First Mandate**:
   - Never inject remote API keys (OpenAI, Anthropic) into core execution flows.
   - All AI calls must target local endpoints (`http://localhost:11434/api/generate` or local MLX runtime).
2. **Deterministic Error Parsing**:
   - The test error parser must handle Swift (`error: ...`), TypeScript/Jest (`● Test suite failed to run`), Python (`FAILED ...`), and Rust (`error[E...]:`).
3. **Safety First**:
   - Destructive Git operations (e.g., `git branch -D`, `git stash drop`, `git clean -fd`) MUST require an explicit `--force` flag or interactive confirmation.
4. **Preserve Comments & Formatting**:
   - Maintain all JSDoc and TypeScript type annotations when editing existing source files.
