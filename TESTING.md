# TESTING.md — GitRadar AI Testing Guidelines

> Test architecture, mock strategies, and regression verification rules for GitRadar AI.

---

## 🧪 1. Test Strategy

GitRadar AI employs a three-tier test methodology:
1. **Unit Tests**: Pure logic testing for error string parsers, unified diff patchers, and packfile analyzers.
2. **Mock Git Repositories**: Ephemeral temporary Git repositories (`fs.mkdtemp`) initialized during integration tests to safely verify branch pruning, stashing, and commit generation without touching actual workspace projects.
3. **Mock LLM Server**: In-memory HTTP server returning deterministic synthetic responses to test agent loop convergence, error handling, and timeout behavior.

---

## ⚡ 2. Test Commands

```bash
# Run all unit tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run with code coverage report
npm run test:coverage
```

---

## 🔍 3. Mocking Patterns

```typescript
// Example: Mock local LLM response for test repair loop
import { vi } from 'vitest';

export const mockLocalLLM = {
  generateFix: vi.fn().mockResolvedValue({
    filePath: 'Sources/App/Main.swift',
    patch: '@@ -10,3 +10,3 @@\n- let x: Int = "str"\n+ let x: String = "str"',
    rationale: 'Corrected type mismatch from Int to String'
  })
};
```
