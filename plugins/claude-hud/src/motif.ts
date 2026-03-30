import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MotifState, MotifTask } from './types.js';

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

    // Normalize tasks: motif writes an array, HUD expects Record<string, MotifTask>
    let tasks: Record<string, MotifTask> = {};
    if (Array.isArray(state.tasks)) {
      for (const t of state.tasks) {
        if (t && typeof t === 'object' && t.id) {
          tasks[t.id] = t as MotifTask;
        }
      }
    } else if (state.tasks && typeof state.tasks === 'object') {
      tasks = state.tasks as Record<string, MotifTask>;
    }

    // Derive counters from tasks when explicit counters are missing
    const taskValues = Object.values(tasks);
    const tasksTotal = state.tasksTotal ?? taskValues.length;
    const tasksCompleted = state.tasksCompleted ?? taskValues.filter(t => t.status === 'completed').length;
    const tasksFailed = state.tasksFailed ?? taskValues.filter(t => t.status === 'failed').length;

    return {
      stage: state.stage,
      complexity: state.complexity ?? null,
      task: state.task,
      startedAt: state.startedAt,
      stageStartedAt: state.stageStartedAt ?? state.startedAt,
      activeAgent: state.activeAgent ?? null,
      autoApprove: state.autoApprove ?? false,
      criticChoice: state.criticChoice ?? null,
      tasksCompleted,
      tasksTotal,
      tasksFailed,
      tasks,
    };
  } catch {
    return null;
  }
}
