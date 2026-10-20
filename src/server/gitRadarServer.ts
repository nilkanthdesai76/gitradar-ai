import http from 'node:http';
import { GitOps } from '../git/gitOps.ts';
import { LocalModelClient } from '../llm/localModelClient.ts';
import { RepairLoop } from '../engine/repairLoop.ts';

export class GitRadarServer {
  private port: number;
  private gitOps = new GitOps();
  private llmClient = new LocalModelClient();
  private server: http.Server | null = null;

  constructor(port = 5051) {
    this.port = port;
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handle(req, res));
      this.server.on('error', reject);
      this.server.listen(this.port, '127.0.0.1', () => {
        resolve(this.port);
      });
    });
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/status') {
      const status = await this.gitOps.getStatus();
      const diff = await this.gitOps.getDiff(false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status, diff }));
      return;
    }

    if (url.pathname === '/api/commit' && req.method === 'POST') {
      const diff = await this.gitOps.getDiff(false);
      const suggestion = await this.llmClient.generateCommitMessage(diff);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(suggestion));
      return;
    }

    if (url.pathname === '/api/audit') {
      const audit = await this.gitOps.audit(5);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(audit));
      return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.renderHtml());
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private renderHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitRadar AI — Autonomous Local Developer Agent</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #131b2e;
      --border: #1f2d4d;
      --accent: #00d2ff;
      --green: #00e676;
      --orange: #ff9100;
      --text: #f0f4fc;
      --muted: #8899b7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 22px; display: flex; align-items: center; gap: 10px; color: var(--accent); }
    .badge { background: rgba(0, 210, 255, 0.15); color: var(--accent); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    .card h2 { font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    pre { background: #070a12; padding: 14px; border-radius: 8px; font-family: ui-monospace, Menlo, monospace; font-size: 13px; color: var(--green); overflow-x: auto; max-height: 220px; border: 1px solid rgba(255,255,255,0.05); }
    button { background: var(--accent); color: #000; font-weight: 600; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 13px; margin-top: 12px; }
    button:hover { opacity: 0.9; transform: translateY(-1px); }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background: rgba(0, 230, 118, 0.15); color: var(--green); margin-bottom: 8px; }
    .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    .stat-label { color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>⚡ GitRadar AI Studio</h1>
      <p style="color: var(--muted); font-size: 13px; margin-top: 4px;">Local-First Apple Silicon Developer Agent • Model Context Protocol • Qwen 2.5 Coder</p>
    </div>
    <div class="badge">Port 5051 • Local Active</div>
  </header>

  <div class="grid">
    <div class="card">
      <h2>📁 Working Tree Inspector</h2>
      <div class="tag">REAL-TIME GIT STATUS</div>
      <pre id="gitStatus">Loading git status...</pre>
      <button onclick="refreshStatus()">Refresh Working Tree</button>
    </div>

    <div class="card">
      <h2>🧠 Local Qwen 2.5 Commit Generator</h2>
      <div class="tag">CONVENTIONAL COMMITS</div>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 10px;">Analyzes semantic uncommitted diffs on Apple Silicon MPS and produces high-quality conventional commit messages.</p>
      <pre id="commitSuggestion">Click generate to run local model...</pre>
      <button onclick="generateCommit()">Generate Semantic Commit</button>
    </div>

    <div class="card">
      <h2>🛡️ Repository Health & Blob Audit</h2>
      <div class="tag">PACKFILE INTELLIGENCE</div>
      <div id="auditContainer">
        <div class="stat-row"><span class="stat-label">Merged Branches</span><span id="auditBranches">0</span></div>
        <div class="stat-row"><span class="stat-label">Large Blobs (>5MB)</span><span id="auditBlobs">0</span></div>
        <div class="stat-row"><span class="stat-label">Local Model Engine</span><span>Qwen 2.5 Coder (7B Metal)</span></div>
      </div>
      <button onclick="runAudit()">Run Repository Audit</button>
    </div>

    <div class="card">
      <h2>🔌 MCP Tools Catalog</h2>
      <div class="tag">JSON-RPC EXPOSURE</div>
      <div class="stat-row"><span class="stat-label">gitradar_scan</span><span>Inspect repo health across disk</span></div>
      <div class="stat-row"><span class="stat-label">gitradar_diff</span><span>Analyze staged & unstaged changes</span></div>
      <div class="stat-row"><span class="stat-label">gitradar_fix</span><span>Autonomous test & repair loop</span></div>
      <div class="stat-row"><span class="stat-label">gitradar_audit</span><span>Find merged branches and blobs</span></div>
    </div>
  </div>

  <script>
    async function refreshStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('gitStatus').textContent = data.status || '(Working tree clean - no uncommitted changes)';
      } catch (e) {
        document.getElementById('gitStatus').textContent = 'Error: ' + e.message;
      }
    }

    async function generateCommit() {
      document.getElementById('commitSuggestion').textContent = 'Thinking with Qwen 2.5 Coder...';
      try {
        const res = await fetch('/api/commit', { method: 'POST' });
        const data = await res.json();
        document.getElementById('commitSuggestion').textContent = data.rawMessage || JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('commitSuggestion').textContent = 'Error: ' + e.message;
      }
    }

    async function runAudit() {
      try {
        const res = await fetch('/api/audit');
        const data = await res.json();
        document.getElementById('auditBranches').textContent = (data.mergedBranches || []).length;
        document.getElementById('auditBlobs').textContent = (data.largeBlobs || []).length;
      } catch (e) {
        alert('Audit error: ' + e.message);
      }
    }

    refreshStatus();
  </script>
</body>
</html>`;
  }
}
