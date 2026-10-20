# GitRadar AI 📡🤖

> The local-first, privacy-guaranteed autonomous developer workstation powered by **Qwen 2.5 Coder** and the **Model Context Protocol (MCP)** on Apple Silicon.

[![Platform](https://img.shields.io/badge/Platform-macOS%20Apple%20Silicon-blue.svg)](https://apple.com)
[![Model](https://img.shields.io/badge/Model-Qwen%202.5%20Coder-purple.svg)](https://github.com/QwenLM/Qwen2.5-Coder)
[![Protocol](https://img.shields.io/badge/Protocol-MCP%202024--11--05-green.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

- 🤖 **Autonomous Test & Repair Loop (`gitradar-ai fix`)** — Intercepts compiler errors and unit test failures, feeds context to local Qwen 2.5 Coder on M2 Pro, patches source files, and verifies until green.
- ✍️ **Conventional Semantic Committer (`gitradar-ai commit`)** — Analyzes staged/unstaged diffs locally and crafts standardized commits (`feat:`, `fix:`, `refactor:`) with bulleted rationale.
- 🔌 **Full-Featured MCP Server (`gitradar-ai mcp`)** — Exposes repository discovery, diffs, and health tools to Claude Code, Cursor, Windsurf, and Antigravity.
- 📦 **Packfile Bloat Radar (`gitradar-ai audit`)** — Uncovers large binary assets ($> 10\text{MB}$) buried in git history and prunes dead merged branches safely.
- 🔒 **100% Private & Air-Gapped** — Zero data leaves your machine. Powered by Apple Silicon unified memory and Metal Performance Shaders.

---

## ⚡ Quick Start

```bash
# Clone and setup
cd gitradar-ai
npm install
npm run build

# Run autonomous test-and-fix on current repo
gitradar-ai fix

# Generate intelligent commit message from diff
gitradar-ai commit

# Start MCP server for Cursor / Claude Desktop / Antigravity
gitradar-ai mcp
```

---

## 📚 Documentation Pillars
- [PRD.md](docs/PRD.md) — Product specifications and acceptance criteria
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System taxonomy, diagrams, and sequence flows
- [AGENTS.md](AGENTS.md) — Invariants and commands for AI coding assistants
- [TESTING.md](docs/TESTING.md) — Test suites, mock strategies, and coverage
- [SECURITY.md](docs/SECURITY.md) — Zero-cloud privacy and execution isolation
