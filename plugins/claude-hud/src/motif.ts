import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MotifState } from './types.js';

export async function loadMotifState(cwd?: string): Promise<MotifState | null> {
  if (!cwd) return null;

  const statePath = path.join(cwd, '.motif', 'state.json');
  const activePath = path.join(cwd, '.motif', '.active');

  try {
    // Only show motif status if workflow is active
    if (!fs.existsSync(activePath)) {
      return null;
    }

    if (!fs.existsSync(statePath)) {
      return null;
    }

    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content) as MotifState;

    // Validate required fields
    if (!state.stage || !state.task) {
      return null;
    }

    return {
      stage: state.stage,
      complexity: state.complexity ?? null,
      task: state.task,
      startedAt: state.startedAt,
      stageStartedAt: state.stageStartedAt,
      activeAgent: state.activeAgent ?? null,
      autoApprove: state.autoApprove ?? false,
      criticChoice: state.criticChoice ?? null,
      tasksCompleted: state.tasksCompleted ?? 0,
      tasksTotal: state.tasksTotal ?? 0,
      tasksFailed: state.tasksFailed ?? 0,
      tasks: state.tasks ?? {},
    };
  } catch {
    return null;
  }
}
