import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DiffPatcher } from '../src/patcher/diffPatcher.ts';

describe('DiffPatcher File Updates & Atomic Rollback', () => {
  let tempFile: string;
  const patcher = new DiffPatcher();

  afterEach(async () => {
    try {
      await fs.unlink(tempFile);
    } catch {}
  });

  test('applies surgical patch to file on disk', async () => {
    tempFile = path.join(os.tmpdir(), `diff_patcher_test_${Date.now()}.txt`);
    const initialContent = 'line 1\nlet x: Int = 10\nline 3';
    await fs.writeFile(tempFile, initialContent, 'utf8');

    const success = await patcher.applyPatch({
      filePath: tempFile,
      originalChunk: 'let x: Int = 10',
      replacementChunk: 'let x: String = "ten"',
      rationale: 'Update type'
    });

    assert.strictEqual(success, true);
    const updated = await fs.readFile(tempFile, 'utf8');
    assert.strictEqual(updated, 'line 1\nlet x: String = "ten"\nline 3');
  });

  test('rolls back applied changes atomically', async () => {
    tempFile = path.join(os.tmpdir(), `diff_rollback_test_${Date.now()}.txt`);
    const initialContent = 'original line A\noriginal line B';
    await fs.writeFile(tempFile, initialContent, 'utf8');

    await patcher.applyPatch({
      filePath: tempFile,
      originalChunk: 'original line A',
      replacementChunk: 'modified line A',
      rationale: 'Temporary change'
    });

    let modified = await fs.readFile(tempFile, 'utf8');
    assert.ok(modified.includes('modified line A'));

    await patcher.rollbackAll();

    let reverted = await fs.readFile(tempFile, 'utf8');
    assert.strictEqual(reverted, initialContent);
  });
});
