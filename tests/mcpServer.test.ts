import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GitRadarMcpServer } from '../src/mcp/gitRadarMcpServer.ts';

describe('GitRadarMcpServer JSON-RPC Protocol', () => {
  const server = new GitRadarMcpServer();

  test('handles initialize handshake', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.strictEqual(res.id, 1);
    assert.strictEqual(res.result.protocolVersion, '2024-11-05');
    assert.strictEqual(res.result.serverInfo.name, 'gitradar-ai-mcp');
  });

  test('lists all exposed GitRadar MCP tools', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.ok(Array.isArray(res.result.tools));
    assert.ok(res.result.tools.some((t: any) => t.name === 'git_status'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'git_diff'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'git_semantic_commit'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'git_repair'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'git_audit'));
  });

  test('executes git_status tool', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'git_status', arguments: {} }
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.strictEqual(res.result.isError, false);
    assert.ok(Array.isArray(res.result.content));
    assert.strictEqual(res.result.content[0].type, 'text');
  });
});
