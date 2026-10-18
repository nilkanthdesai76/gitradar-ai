import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { LargeBlob, AuditReport } from '../types/index.ts';

const execFileAsync = promisify(execFile);

export class GitOps {
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  private async execGit(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd: this.repoPath });
    return stdout.trim();
  }

  public async getStatus(): Promise<string> {
    return this.execGit(['status', '--short']);
  }

  public async getDiff(staged: boolean = false): Promise<string> {
    const args = ['diff'];
    if (staged) args.push('--staged');
    return this.execGit(args);
  }

  public async getRecentLog(count: number = 5): Promise<string> {
    return this.execGit(['log', `-${count}`, '--oneline']);
  }

  public async createSafetyCheckpoint(): Promise<string> {
    try {
      const sha = await this.execGit(['stash', 'create']);
      return sha || 'HEAD';
    } catch {
      return 'HEAD';
    }
  }

  public async rollbackCheckpoint(sha: string): Promise<void> {
    if (sha && sha !== 'HEAD') {
      try {
        await this.execGit(['reset', '--hard', 'HEAD']);
      } catch (err) {
        console.error('Git rollback error:', err);
      }
    }
  }

  public async getMergedBranches(targetBranch: string = 'main'): Promise<string[]> {
    try {
      const output = await this.execGit(['branch', '--merged', targetBranch]);
      return output
        .split('\n')
        .map(b => b.replace('*', '').trim())
        .filter(b => b && b !== 'main' && b !== 'master' && !b.startsWith('+'));
    } catch {
      return [];
    }
  }

  public async pruneMergedBranches(targetBranch: string = 'main'): Promise<string[]> {
    const branches = await this.getMergedBranches(targetBranch);
    const pruned: string[] = [];
    for (const b of branches) {
      try {
        await this.execGit(['branch', '-d', b]);
        pruned.push(b);
      } catch {
        // Ignored if cannot delete
      }
    }
    return pruned;
  }

  public async findLargeBlobs(thresholdMb: number = 10): Promise<LargeBlob[]> {
    const thresholdBytes = thresholdMb * 1024 * 1024;
    const blobs: LargeBlob[] = [];

    try {
      // Find all objects in rev-list
      const revListOutput = await this.execGit(['rev-list', '--objects', '--all']);
      const lines = revListOutput.split('\n');

      for (const line of lines.slice(0, 500)) { // Bound scan to first 500 objects
        const [sha, ...pathParts] = line.trim().split(' ');
        if (!sha || pathParts.length === 0) continue;

        try {
          const sizeStr = await this.execGit(['cat-file', '-s', sha]);
          const size = parseInt(sizeStr, 10);
          if (size >= thresholdBytes) {
            blobs.push({
              sha,
              sizeBytes: size,
              path: pathParts.join(' ')
            });
          }
        } catch {
          // Object may not be a blob
        }
      }
    } catch {
      // Ignore if not a git repo
    }

    return blobs;
  }

  public async commit(message: string, stageAll: boolean = false): Promise<string> {
    if (stageAll) {
      await this.execGit(['add', '-A']);
    }
    return this.execGit(['commit', '-m', message]);
  }

  public async audit(blobThresholdMb: number = 10): Promise<AuditReport> {
    const largeBlobs = await this.findLargeBlobs(blobThresholdMb);
    const mergedBranches = await this.getMergedBranches();
    const reclaimableBytes = largeBlobs.reduce((acc, b) => acc + b.sizeBytes, 0);

    return {
      repoPath: this.repoPath,
      largeBlobs,
      mergedBranches,
      danglingStashes: [],
      reclaimableBytes
    };
  }
}
