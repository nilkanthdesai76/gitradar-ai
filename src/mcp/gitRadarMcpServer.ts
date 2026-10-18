import { GitOps } from '../git/gitOps.ts';
import { LocalModelClient } from '../llm/localModelClient.ts';
import { RepairLoop } from '../engine/repairLoop.ts';

export class GitRadarMcpServer {
  private gitOps = new GitOps();
  private llmClient = new LocalModelClient();

  private tools = [
    {
      name: 'git_status',
      description: 'Returns git status summary of working tree',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'git_diff',
      description: 'Returns git diff of working tree or staged changes',
      inputSchema: {
        type: 'object',
        properties: {
          staged: { type: 'boolean', description: 'Inspect staged changes only' }
        }
      }
    },
    {
      name: 'git_recent_log',
      description: 'Returns recent git commits',
      inputSchema: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Number of commits', default: 5 }
        }
      }
    },
    {
      name: 'git_semantic_commit',
      description: 'Generates a conventional commit message from diff and commits changes',
      inputSchema: {
        type: 'object',
        properties: {
          stageAll: { type: 'boolean', description: 'Auto-stage modified files', default: true }
        }
      }
    },
    {
      name: 'git_audit',
      description: 'Audits repository for large binary packfile bloat and merged branches',
      inputSchema: {
        type: 'object',
        properties: {
          blobThresholdMb: { type: 'number', description: 'Threshold in MB', default: 10 }
        }
      }
    },
    {
      name: 'git_repair',
      description: 'Executes autonomous test-and-repair loop on compiler errors',
      inputSchema: {
        type: 'object',
        properties: {
          testCommand: { type: 'string', description: 'Test command to run', default: 'npm test' },
          maxIterations: { type: 'number', description: 'Max retry loops', default: 5 }
        }
      }
    }
  ];

  public async handleMessage(req: any): Promise<any> {
    switch (req.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true } },
            serverInfo: { name: 'gitradar-ai-mcp', version: '1.0.0' }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: { tools: this.tools }
        };

      case 'tools/call': {
        const name = req.params?.name;
        const args = req.params?.arguments || {};
        const content = await this.executeTool(name, args);
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: { content, isError: false }
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id: req.id,
          error: { code: -32601, message: `Method not found: ${req.method}` }
        };
    }
  }

  private async executeTool(name: string, args: Record<string, any>): Promise<any[]> {
    switch (name) {
      case 'git_status': {
        const status = await this.gitOps.getStatus();
        return [{ type: 'text', text: status || 'Working tree clean' }];
      }

      case 'git_diff': {
        const diff = await this.gitOps.getDiff(args.staged === true);
        return [{ type: 'text', text: diff || 'No diff detected' }];
      }

      case 'git_recent_log': {
        const log = await this.gitOps.getRecentLog(args.count || 5);
        return [{ type: 'text', text: log }];
      }

      case 'git_semantic_commit': {
        const diff = await this.gitOps.getDiff(false);
        const suggestion = await this.llmClient.generateCommitMessage(diff);
        const output = await this.gitOps.commit(suggestion.rawMessage, args.stageAll !== false);
        return [{ type: 'text', text: `Committed: "${suggestion.rawMessage}"\n${output}` }];
      }

      case 'git_audit': {
        const audit = await this.gitOps.audit(args.blobThresholdMb || 10);
        return [{ type: 'text', text: JSON.stringify(audit, null, 2) }];
      }

      case 'git_repair': {
        const loop = new RepairLoop({
          testCommand: args.testCommand || 'npm test',
          maxIterations: args.maxIterations || 5
        });
        const summary = await loop.run();
        return [{ type: 'text', text: JSON.stringify(summary, null, 2) }];
      }

      default:
        return [{ type: 'text', text: `Unknown tool: ${name}` }];
    }
  }

  public static runStdio(): void {
    const server = new GitRadarMcpServer();
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line);
          const res = await server.handleMessage(req);
          process.stdout.write(JSON.stringify(res) + '\n');
        } catch {
          process.stderr.write(`[gitradar-mcp] Invalid JSON: ${line}\n`);
        }
      }
    });
  }
}
