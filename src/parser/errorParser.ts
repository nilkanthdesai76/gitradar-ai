import type { DiagnosticError, SupportedLanguage } from '../types/index.ts';

export class ErrorParser {
  // Swift compiler error: /path/file.swift:42:15: error: message
  private static readonly SWIFT_REGEX = /^([^\s:\n]+):(\d+):(\d+):\s+error:\s+(.+)$/gm;

  // TypeScript / Jest error: at Object.<anonymous> (/path/file.ts:42:15) or /path/file.ts:42:15
  private static readonly JEST_STACK_REGEX = /(?:at\s+.*?\((.*?):(\d+):(\d+)\)|([^\s:\n]+\.[jt]sx?):(\d+):(\d+))/g;

  // Pytest error: test_file.py:42: AssertionError: message
  private static readonly PYTEST_REGEX = /^([^\s:\n]+\.py):(\d+):\s+(?:in\s+\w+\n)?(?:E\s+)?([A-Za-z]+Error:[^\n]+|AssertionError[^\n]*)/gm;

  // Rust / Cargo error: --> src/main.rs:42:15
  private static readonly RUST_REGEX = /error(?:\[E\d+\])?:\s+(.+)\n\s+-->\s+([^\s:\n]+):(\d+):(\d+)/gm;

  // Go test failure: file.go:42: error message
  private static readonly GO_REGEX = /^\s*([^\s:\n]+\.go):(\d+):\s+(.+)$/gm;

  /**
   * Parses compiler or test execution stdout/stderr into structured diagnostics.
   */
  public static parse(output: string, forcedLanguage?: SupportedLanguage): DiagnosticError[] {
    const results: DiagnosticError[] = [];

    // 1. Swift
    if (!forcedLanguage || forcedLanguage === 'swift') {
      let match: RegExpExecArray | null;
      const re = new RegExp(this.SWIFT_REGEX.source, 'gm');
      while ((match = re.exec(output)) !== null) {
        results.push({
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          message: match[4].trim(),
          language: 'swift',
          raw: match[0]
        });
      }
    }

    // 2. Rust
    if (!forcedLanguage || forcedLanguage === 'rust') {
      let match: RegExpExecArray | null;
      const re = new RegExp(this.RUST_REGEX.source, 'gm');
      while ((match = re.exec(output)) !== null) {
        results.push({
          filePath: match[2],
          lineNumber: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
          message: match[1].trim(),
          language: 'rust',
          raw: match[0]
        });
      }
    }

    // 3. Pytest
    if (!forcedLanguage || forcedLanguage === 'python') {
      let match: RegExpExecArray | null;
      const re = new RegExp(this.PYTEST_REGEX.source, 'gm');
      while ((match = re.exec(output)) !== null) {
        results.push({
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
          message: match[3].trim(),
          language: 'python',
          raw: match[0]
        });
      }
    }

    // 4. Go
    if (!forcedLanguage || forcedLanguage === 'go') {
      let match: RegExpExecArray | null;
      const re = new RegExp(this.GO_REGEX.source, 'gm');
      while ((match = re.exec(output)) !== null) {
        results.push({
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
          message: match[3].trim(),
          language: 'go',
          raw: match[0]
        });
      }
    }

    // 5. TypeScript / Jest
    if ((!forcedLanguage || forcedLanguage === 'typescript') && results.length === 0) {
      let match: RegExpExecArray | null;
      const re = new RegExp(this.JEST_STACK_REGEX.source, 'g');
      while ((match = re.exec(output)) !== null) {
        const file = match[1] || match[4];
        const line = match[2] || match[5];
        const col = match[3] || match[6];
        if (file && line) {
          results.push({
            filePath: file,
            lineNumber: parseInt(line, 10),
            column: col ? parseInt(col, 10) : undefined,
            message: 'Test failure at stack trace location',
            language: 'typescript',
            raw: match[0]
          });
          break; // Grab the primary failure location
        }
      }
    }

    return results;
  }
}
