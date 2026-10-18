/**
 * GitRadar AI Core Type Definitions
 */

export type SupportedLanguage = 'swift' | 'typescript' | 'python' | 'rust' | 'go' | 'generic';

export interface DiagnosticError {
  filePath: string;
  lineNumber: number;
  column?: number;
  message: string;
  language: SupportedLanguage;
  raw?: string;
}

export interface RepairPatch {
  filePath: string;
  originalChunk: string;
  replacementChunk: string;
  rationale: string;
}

export interface CommitSuggestion {
  type: 'feat' | 'fix' | 'refactor' | 'perf' | 'test' | 'docs' | 'chore';
  scope?: string;
  subject: string;
  body?: string;
  rawMessage: string;
}

export interface LargeBlob {
  sha: string;
  sizeBytes: number;
  path: string;
}

export interface AuditReport {
  repoPath: string;
  largeBlobs: LargeBlob[];
  mergedBranches: string[];
  danglingStashes: string[];
  reclaimableBytes: number;
}

export interface LoopIterationResult {
  iteration: number;
  testsPassed: boolean;
  diagnostics: DiagnosticError[];
  patchApplied?: RepairPatch;
  error?: string;
}

export interface RepairLoopSummary {
  success: boolean;
  totalIterations: number;
  resolvedErrors: DiagnosticError[];
  appliedPatches: RepairPatch[];
  durationMs: number;
}
