import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getWorktreePr } from '../dist/pr-cache.js';

function cacheFileFor(configDir, cwd, branch) {
  const key = createHash('sha256').update(`${cwd}\0${branch}`).digest('hex').slice(0, 16);
  return path.join(configDir, 'plugins', 'claude-hud', 'worktree-pr-cache', `${key}.json`);
}

test('getWorktreePr returns null without spawning when cwd or branch is missing', () => {
  assert.equal(getWorktreePr('', 'feat-x'), null);
  assert.equal(getWorktreePr('/some/wt', ''), null);
});

test('getWorktreePr returns a fresh cached PR number without refreshing', async () => {
  const prevConfigDir = process.env.CLAUDE_CONFIG_DIR;
  const configDir = await mkdtemp(path.join(tmpdir(), 'claude-hud-prcache-'));
  process.env.CLAUDE_CONFIG_DIR = configDir;
  try {
    const cwd = '/home/user/project/.worktrees/feat-x';
    const branch = 'feat-x';
    const now = 1_700_000_000_000;
    const file = cacheFileFor(configDir, cwd, branch);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ pr: 123, updatedAt: now }));

    // now equal to updatedAt → fresh, so the cached value is returned as-is.
    assert.equal(getWorktreePr(cwd, branch, now), 123);
  } finally {
    if (prevConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prevConfigDir;
    await rm(configDir, { recursive: true, force: true });
  }
});

test('getWorktreePr returns a fresh cached null (branch has no PR)', async () => {
  const prevConfigDir = process.env.CLAUDE_CONFIG_DIR;
  const configDir = await mkdtemp(path.join(tmpdir(), 'claude-hud-prcache-'));
  process.env.CLAUDE_CONFIG_DIR = configDir;
  try {
    const cwd = '/home/user/project/.worktrees/no-pr';
    const branch = 'no-pr';
    const now = 1_700_000_000_000;
    const file = cacheFileFor(configDir, cwd, branch);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ pr: null, updatedAt: now }));

    assert.equal(getWorktreePr(cwd, branch, now), null);
  } finally {
    if (prevConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prevConfigDir;
    await rm(configDir, { recursive: true, force: true });
  }
});
