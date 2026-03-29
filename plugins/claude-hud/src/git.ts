import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface FileStats {
  modified: number;
  added: number;
  deleted: number;
  untracked: number;
}

export interface DiffStats {
  insertions: number;
  deletions: number;
}

export interface GitStatus {
  branch: string;
  isDirty: boolean;
  ahead: number;
  behind: number;
  fileStats?: FileStats;
  diffStats?: DiffStats;
}

export async function getGitBranch(cwd?: string): Promise<string | null> {
  if (!cwd) return null;

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd, timeout: 1000, encoding: 'utf8' }
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export interface GitStatusOptions {
  showAheadBehind?: boolean;
  showFileStats?: boolean;
}

export async function getGitStatus(cwd?: string, options?: GitStatusOptions): Promise<GitStatus | null> {
  if (!cwd) return null;

  // Determine which optional subprocesses to run.
  // When options is not provided (backward compat), run all subprocesses.
  const runAheadBehind = options === undefined || options.showAheadBehind === true;
  const runDiffStats = options === undefined || options.showFileStats === true;

  try {
    // Get branch name first — needed for early return check
    const { stdout: branchOut } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd, timeout: 1000, encoding: 'utf8' }
    );
    const branch = branchOut.trim();
    if (!branch) return null;

    // Run remaining subprocesses in parallel
    const [statusResult, aheadBehindResult, diffResult] = await Promise.all([
      // Subprocess 2: dirty state + file stats (always run)
      execFileAsync(
        'git',
        ['--no-optional-locks', 'status', '--porcelain'],
        { cwd, timeout: 1000, encoding: 'utf8' }
      ).catch(() => null),

      // Subprocess 3: ahead/behind (gated on showAheadBehind)
      runAheadBehind
        ? execFileAsync(
            'git',
            ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
            { cwd, timeout: 1000, encoding: 'utf8' }
          ).catch(() => null)
        : Promise.resolve(null),

      // Subprocess 4: diff shortstat (gated on showFileStats)
      runDiffStats
        ? execFileAsync(
            'git',
            ['diff', 'HEAD', '--shortstat'],
            { cwd, timeout: 1000, encoding: 'utf8' }
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Parse dirty state and file stats
    let isDirty = false;
    let fileStats: FileStats | undefined;
    if (statusResult) {
      const trimmed = statusResult.stdout.trim();
      isDirty = trimmed.length > 0;
      if (isDirty) {
        fileStats = parseFileStats(trimmed);
      }
    }

    // Parse ahead/behind counts
    let ahead = 0;
    let behind = 0;
    if (aheadBehindResult) {
      const parts = aheadBehindResult.stdout.trim().split(/\s+/);
      if (parts.length === 2) {
        behind = parseInt(parts[0], 10) || 0;
        ahead = parseInt(parts[1], 10) || 0;
      }
    }

    // Parse diff line stats
    let diffStats: DiffStats | undefined;
    if (diffResult) {
      diffStats = parseShortstat(diffResult.stdout.trim());
    }

    return { branch, isDirty, ahead, behind, fileStats, diffStats };
  } catch {
    return null;
  }
}

export function parseShortstat(line: string): DiffStats | undefined {
  if (!line) return undefined;

  let insertions = 0;
  let deletions = 0;

  const insMatch = line.match(/(\d+)\s+insertion/);
  if (insMatch) insertions = parseInt(insMatch[1], 10);

  const delMatch = line.match(/(\d+)\s+deletion/);
  if (delMatch) deletions = parseInt(delMatch[1], 10);

  if (insertions === 0 && deletions === 0) return undefined;

  return { insertions, deletions };
}

/**
 * Parse git status --porcelain output and count file stats (Starship-compatible format)
 * Status codes: M=modified, A=added, D=deleted, ??=untracked
 */
function parseFileStats(porcelainOutput: string): FileStats {
  const stats: FileStats = { modified: 0, added: 0, deleted: 0, untracked: 0 };
  const lines = porcelainOutput.split('\n').filter(Boolean);

  for (const line of lines) {
    if (line.length < 2) continue;

    const index = line[0];    // staged status
    const worktree = line[1]; // unstaged status

    if (line.startsWith('??')) {
      stats.untracked++;
    } else if (index === 'A') {
      stats.added++;
    } else if (index === 'D' || worktree === 'D') {
      stats.deleted++;
    } else if (index === 'M' || worktree === 'M' || index === 'R' || index === 'C') {
      // M=modified, R=renamed (counts as modified), C=copied (counts as modified)
      stats.modified++;
    }
  }

  return stats;
}
