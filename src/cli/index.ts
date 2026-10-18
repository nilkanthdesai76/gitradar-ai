import { GitOps } from '../git/gitOps.ts';
import { LocalModelClient } from '../llm/localModelClient.ts';
import { RepairLoop } from '../engine/repairLoop.ts';
import { GitRadarMcpServer } from '../mcp/gitRadarMcpServer.ts';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'demo';

  if (command === 'mcp') {
    GitRadarMcpServer.runStdio();
    return;
  }

  console.log('\u001B[2J\u001B[H'); // Clear screen
  console.log(`\u001B[1;36m=========================================================================\u001B[0m`);
  console.log(`\u001B[1;32m         ⚡ GitRadar AI — Autonomous Developer Agent & MCP Suite        \u001B[0m`);
  console.log(`\u001B[1;36m=========================================================================\u001B[0m`);
  console.log(`Local-First Apple Silicon AI • Qwen 2.5 Coder • Model Context Protocol\n`);

  const gitOps = new GitOps();
  const llmClient = new LocalModelClient();

  if (command === 'fix') {
    const testCmd = args[1] || 'swift test';
    console.log(`\u001B[1;33m🔄 Starting Autonomous Test-and-Repair Loop (cmd: "${testCmd}")...\u001B[0m`);
    const loop = new RepairLoop({ testCommand: testCmd });
    const result = await loop.run();
    console.log(`  Result: ${result.success ? '✅ Fixed' : '❌ Unresolved'}`);
    console.log(`  Iterations: ${result.totalIterations} | Time: ${result.durationMs} ms`);
    return;
  }

  if (command === 'commit') {
    console.log(`\u001B[1;33m📝 Analyzing working tree diff for semantic conventional commit...\u001B[0m`);
    const diff = await gitOps.getDiff(false);
    const suggestion = await llmClient.generateCommitMessage(diff);
    console.log(`\n  Suggested Commit: \u001B[1;32m${suggestion.rawMessage}\u001B[0m\n`);
    return;
  }

  if (command === 'audit') {
    console.log(`\u001B[1;33m🔍 Auditing repository packfiles and merged branches...\u001B[0m`);
    const auditReport = await gitOps.audit(5);
    console.log(`  Merged Branches: ${auditReport.mergedBranches.length}`);
    console.log(`  Large Blobs: ${auditReport.largeBlobs.length}`);
    return;
  }

  // Default: Interactive System Overview
  console.log(`\u001B[1;33m[1/3] Local Git Working Tree Status...\u001B[0m`);
  const status = await gitOps.getStatus();
  console.log(`  Status:\n${status ? status.split('\n').map(l => '    ' + l).join('\n') : '    (Clean working tree)'}\n`);

  console.log(`\u001B[1;33m[2/3] Semantic Conventional Commit Generator...\u001B[0m`);
  const sampleDiff = `diff --git a/Sources/Core/Engine.swift b/Sources/Core/Engine.swift
index 123..456 100644
--- a/Sources/Core/Engine.swift
+++ b/Sources/Core/Engine.swift
@@ -10,2 +10,2 @@
-let sampleRate: Float = 44100.0
+let sampleRate: Float = 48000.0 // upgraded to 48kHz high-res audio`;
  const suggestion = await llmClient.generateCommitMessage(sampleDiff);
  console.log(`  Generated Commit: \u001B[1;32m"${suggestion.rawMessage}"\u001B[0m\n`);

  console.log(`\u001B[1;33m[3/3] Model Context Protocol Server (MCP) Ready...\u001B[0m`);
  console.log(`  Exposed MCP Tools:`);
  console.log(`   • git_status, git_diff, git_recent_log`);
  console.log(`   • git_semantic_commit, git_audit, git_repair\n`);

  console.log(`\u001B[1;32m✨ GitRadar AI verified successfully. Run "gitradar-ai mcp" to launch MCP server.\u001B[0m\n`);
}

main().catch(console.error);
