import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { getHudPluginDir } from './claude-config-dir.js';

const CACHE_DIRNAME = 'worktree-pr-cache';

/** How long a resolved PR number stays fresh before we refresh it. */
const TTL_MS = 120_000;

/** Minimum gap between detached `gh` refreshes for the same worktree+branch. */
const REFRESH_DEBOUNCE_MS = 15_000;

interface PrCacheEntry {
  pr: number | null;
  updatedAt: number;
}

function cacheDir(): string {
  return path.join(getHudPluginDir(os.homedir()), CACHE_DIRNAME);
}

function cacheKey(cwd: string, branch: string): string {
  return createHash('sha256').update(`${cwd}\0${branch}`).digest('hex').slice(0, 16);
}

function readEntry(file: string): PrCacheEntry | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    if (
      parsed && typeof parsed === 'object'
      && (typeof (parsed as PrCacheEntry).pr === 'number' || (parsed as PrCacheEntry).pr === null)
      && typeof (parsed as PrCacheEntry).updatedAt === 'number'
    ) {
      return parsed as PrCacheEntry;
    }
  } catch {
    // missing or malformed cache — treat as no entry
  }
  return null;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Fire a detached `gh pr view` for the worktree's current branch and write the
 * result to the cache file atomically. Never awaited — the spawned shell
 * outlives this process so the statusline tick stays non-blocking.
 */
function triggerRefresh(cwd: string, file: string, now: number): void {
  if (process.platform === 'win32') return;

  const lock = `${file}.lock`;
  try {
    const lockStat = fs.statSync(lock);
    if (now - lockStat.mtimeMs < REFRESH_DEBOUNCE_MS) return;
  } catch {
    // no lock yet — fall through and create one
  }

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(lock, '');
  } catch {
    return;
  }

  const tmp = `${file}.${process.pid}.tmp`;
  // gh prints the PR number (or nothing when there is no PR for the branch).
  const cmd =
    `pr=$(gh pr view --json number -q .number 2>/dev/null); ` +
    `[ -z "$pr" ] && pr=null; ` +
    `printf '{"pr":%s,"updatedAt":%s}' "$pr" ${now} > ${shellQuote(tmp)} && ` +
    `mv ${shellQuote(tmp)} ${shellQuote(file)}`;

  try {
    const child = spawn('sh', ['-c', cmd], { cwd, detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    // gh/sh unavailable — silently give up; branch fallback still renders
  }
}

/**
 * Best-effort PR number for the current worktree branch.
 *
 * Returns the cached PR number when fresh, the last-known value (while a
 * refresh runs) when stale, or null when nothing is cached yet. Resolving the
 * PR requires a network `gh` call, so it always happens in a detached
 * background process and the result is read on a later statusline tick.
 */
export function getWorktreePr(cwd: string, branch: string, now: number = Date.now()): number | null {
  if (!cwd || !branch) return null;

  const file = path.join(cacheDir(), `${cacheKey(cwd, branch)}.json`);
  const entry = readEntry(file);

  if (entry && now - entry.updatedAt < TTL_MS) {
    return entry.pr;
  }

  triggerRefresh(cwd, file, now);
  return entry ? entry.pr : null;
}
