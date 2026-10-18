import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepairPatch } from '../types/index.ts';

export class DiffPatcher {
  private fileBackups = new Map<string, string>();

  /**
   * Applies a repair patch to a file on disk.
   */
  public async applyPatch(patch: RepairPatch, baseDir: string = process.cwd()): Promise<boolean> {
    const fullPath = path.isAbsolute(patch.filePath)
      ? patch.filePath
      : path.join(baseDir, patch.filePath);

    try {
      const originalContent = await fs.readFile(fullPath, 'utf8');

      // Save backup in memory before modifying if not already saved
      if (!this.fileBackups.has(fullPath)) {
        this.fileBackups.set(fullPath, originalContent);
      }

      // Check if original chunk exists
      if (!originalContent.includes(patch.originalChunk)) {
        return false;
      }

      const updatedContent = originalContent.replace(
        patch.originalChunk,
        patch.replacementChunk
      );

      await fs.writeFile(fullPath, updatedContent, 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reverts all modified files back to their initial state.
   */
  public async rollbackAll(): Promise<void> {
    for (const [filePath, content] of this.fileBackups.entries()) {
      try {
        await fs.writeFile(filePath, content, 'utf8');
      } catch (err) {
        console.error(`Failed to rollback file ${filePath}:`, err);
      }
    }
    this.fileBackups.clear();
  }

  /**
   * Clears saved backups after successful test verification.
   */
  public commitChanges(): void {
    this.fileBackups.clear();
  }
}
