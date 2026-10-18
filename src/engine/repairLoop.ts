import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ErrorParser } from '../parser/errorParser.ts';
import { DiffPatcher } from '../patcher/diffPatcher.ts';
import { LocalModelClient } from '../llm/localModelClient.ts';
import { GitOps } from '../git/gitOps.ts';
import type {
  DiagnosticError,
  RepairPatch,
  RepairLoopSummary,
  SupportedLanguage
} from '../types/index.ts';

const execAsync = promisify(exec);

export interface RepairLoopOptions {
  repoPath?: string;
  testCommand?: string;
  maxIterations?: number;
  language?: SupportedLanguage;
  modelClient?: LocalModelClient;
  autoRollback?: boolean;
}

export class RepairLoop {
  private repoPath: string;
  private testCommand: string;
  private maxIterations: number;
  private language?: SupportedLanguage;
  private modelClient: LocalModelClient;
  private autoRollback: boolean;
  private patcher = new DiffPatcher();
  private gitOps: GitOps;

  constructor(options: RepairLoopOptions = {}) {
    this.repoPath = options.repoPath || process.cwd();
    this.testCommand = options.testCommand || 'npm test';
    this.maxIterations = options.maxIterations || 5;
    this.language = options.language;
    this.modelClient = options.modelClient || new LocalModelClient();
    this.autoRollback = options.autoRollback !== false;
    this.gitOps = new GitOps(this.repoPath);
  }

  public async run(): Promise<RepairLoopSummary> {
    const startTime = Date.now();
    const resolvedErrors: DiagnosticError[] = [];
    const appliedPatches: RepairPatch[] = [];

    // 1. Safety snapshot
    const checkpointSha = await this.gitOps.createSafetyCheckpoint();

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      // 2. Run test command
      const testResult = await this.executeTestCommand();

      if (testResult.passed) {
        this.patcher.commitChanges();
        return {
          success: true,
          totalIterations: iteration,
          resolvedErrors,
          appliedPatches,
          durationMs: Date.now() - startTime
        };
      }

      // 3. Parse Diagnostics
      const diagnostics = ErrorParser.parse(testResult.output, this.language);
      if (diagnostics.length === 0) {
        break; // Could not parse structured diagnostics
      }

      const currentDiag = diagnostics[0]; // Take primary diagnostic
      resolvedErrors.push(currentDiag);

      // 4. Read file context
      const fullPath = path.isAbsolute(currentDiag.filePath)
        ? currentDiag.filePath
        : path.join(this.repoPath, currentDiag.filePath);

      let fileContent = '';
      try {
        fileContent = await fs.readFile(fullPath, 'utf8');
      } catch {
        break;
      }

      // 5. Generate Repair Patch via Local Qwen Model
      const patch = await this.modelClient.generateRepair(currentDiag, fileContent);
      if (!patch) {
        break; // Model could not generate valid patch
      }

      // 6. Apply patch
      const patchApplied = await this.patcher.applyPatch(patch, this.repoPath);
      if (!patchApplied) {
        break;
      }

      appliedPatches.push(patch);
    }

    // Rollback if tests still failed and autoRollback is enabled
    if (this.autoRollback) {
      await this.patcher.rollbackAll();
      await this.gitOps.rollbackCheckpoint(checkpointSha);
    }

    return {
      success: false,
      totalIterations: this.maxIterations,
      resolvedErrors,
      appliedPatches,
      durationMs: Date.now() - startTime
    };
  }

  private async executeTestCommand(): Promise<{ passed: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(this.testCommand, { cwd: this.repoPath });
      return { passed: true, output: `${stdout}\n${stderr}` };
    } catch (err: any) {
      const stdout = err.stdout || '';
      const stderr = err.stderr || '';
      return { passed: false, output: `${stdout}\n${stderr}` };
    }
  }
}
