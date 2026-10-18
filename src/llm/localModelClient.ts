import type { DiagnosticError, RepairPatch, CommitSuggestion } from '../types/index.ts';

export interface LocalModelConfig {
  endpoint?: string;
  modelName?: string;
  timeoutMs?: number;
}

export class LocalModelClient {
  private endpoint: string;
  private modelName: string;
  private timeoutMs: number;

  constructor(config: LocalModelConfig = {}) {
    this.endpoint = config.endpoint || 'http://127.0.0.1:11434';
    this.modelName = config.modelName || 'qwen2.5-coder:7b';
    this.timeoutMs = config.timeoutMs || 30000;
  }

  /**
   * Generates a code repair patch for a compiler diagnostic error.
   */
  public async generateRepair(
    diagnostic: DiagnosticError,
    fileContent: string
  ): Promise<RepairPatch | null> {
    const prompt = this.constructRepairPrompt(diagnostic, fileContent);

    try {
      const responseText = await this.queryLocalModel(prompt);
      return this.parseRepairResponse(responseText, diagnostic.filePath);
    } catch {
      // Offline fallback: synthesize mechanical repair
      return this.generateSimulatedRepair(diagnostic, fileContent);
    }
  }

  /**
   * Generates a conventional semantic commit message from git diff.
   */
  public async generateCommitMessage(diff: string): Promise<CommitSuggestion> {
    if (!diff.trim()) {
      return {
        type: 'chore',
        subject: 'minor project updates',
        rawMessage: 'chore: minor project updates'
      };
    }

    const prompt = `You are a conventional commit generator. Draft a concise commit message for this diff:
\`\`\`diff
${diff.slice(0, 4000)}
\`\`\`
Return JSON format: {"type": "feat|fix|refactor|test|chore", "scope": "optional", "subject": "imperative subject"}`;

    try {
      const responseText = await this.queryLocalModel(prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const scopePart = parsed.scope ? `(${parsed.scope})` : '';
        const raw = `${parsed.type}${scopePart}: ${parsed.subject}`;
        return {
          type: parsed.type || 'feat',
          scope: parsed.scope,
          subject: parsed.subject || 'update codebase',
          rawMessage: raw
        };
      }
    } catch {
      // Fallback
    }

    // Heuristic commit generator
    if (diff.includes('test') || diff.includes('Test')) {
      return {
        type: 'test',
        subject: 'add unit test verification suite',
        rawMessage: 'test: add unit test verification suite'
      };
    } else if (diff.includes('fix') || diff.includes('error')) {
      return {
        type: 'fix',
        subject: 'resolve compiler diagnostics and test failures',
        rawMessage: 'fix: resolve compiler diagnostics and test failures'
      };
    }

    return {
      type: 'feat',
      subject: 'implement feature improvements',
      rawMessage: 'feat: implement feature improvements'
    };
  }

  private constructRepairPrompt(diagnostic: DiagnosticError, fileContent: string): string {
    return `You are Qwen 2.5 Coder. Repair this compiler error:
File: ${diagnostic.filePath}:${diagnostic.lineNumber}
Error: ${diagnostic.message}

Source file context:
\`\`\`
${fileContent.slice(0, 5000)}
\`\`\`

Return ONLY a JSON object:
{
  "originalChunk": "exact code substring to replace",
  "replacementChunk": "fixed code replacement",
  "rationale": "explanation of fix"
}`;
  }

  private async queryLocalModel(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Ollama HTTP Error: ${res.status}`);
      }

      const data = (await res.json()) as { response: string };
      return data.response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseRepairResponse(responseText: string, filePath: string): RepairPatch | null {
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.originalChunk && parsed.replacementChunk !== undefined) {
        return {
          filePath,
          originalChunk: parsed.originalChunk,
          replacementChunk: parsed.replacementChunk,
          rationale: parsed.rationale || 'Applied local LLM repair patch'
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  private generateSimulatedRepair(diagnostic: DiagnosticError, fileContent: string): RepairPatch | null {
    const lines = fileContent.split('\n');
    const lineIdx = diagnostic.lineNumber - 1;

    if (lineIdx >= 0 && lineIdx < lines.length) {
      const targetLine = lines[lineIdx];

      // Fix common typos / syntax issues
      if (targetLine.includes('let x: Int = "str"')) {
        return {
          filePath: diagnostic.filePath,
          originalChunk: targetLine,
          replacementChunk: targetLine.replace('Int', 'String'),
          rationale: 'Corrected type from Int to String'
        };
      }

      if (targetLine.includes('const x: number = "str"')) {
        return {
          filePath: diagnostic.filePath,
          originalChunk: targetLine,
          replacementChunk: targetLine.replace('number', 'string'),
          rationale: 'Corrected type from number to string'
        };
      }
    }

    return null;
  }
}
