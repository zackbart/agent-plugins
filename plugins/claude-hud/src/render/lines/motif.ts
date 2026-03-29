import type { RenderContext } from '../../types.js';
import type { MotifTask } from '../../types.js';
import { label, yellow, green, cyan, magenta, dim, red } from '../colors.js';

const STAGE_ICONS: Record<string, string> = {
  research: '🔍',
  plan: '📋',
  build: '🔨',
  validate: '✅',
};

const CRITIC_LABELS: Record<string, string> = {
  codex: 'Codex',
  cursor: 'Cursor',
  claude: 'Claude',
};

export function renderMotifLine(ctx: RenderContext): string | null {
  const state = ctx.motifState;
  if (!state) {
    return null;
  }

  const colors = ctx.config?.colors;
  const parts: string[] = [];

  // Stage with icon and color
  const stageName = state.stage.charAt(0).toUpperCase() + state.stage.slice(1);
  const icon = STAGE_ICONS[state.stage] ?? '▸';
  const stageColor = getStageColor(state.stage);
  parts.push(`${icon} ${stageColor(stageName)}`);

  // Complexity badge
  if (state.complexity) {
    parts.push(dim(`[${state.complexity}]`));
  }

  // Critic badge (relevant during plan stage)
  if (state.criticChoice && state.criticChoice !== 'skip') {
    const criticLabel = CRITIC_LABELS[state.criticChoice] ?? state.criticChoice;
    parts.push(dim(`critic:${criticLabel}`));
  }

  // Auto-approve indicator
  if (state.autoApprove) {
    parts.push(yellow('⚡auto'));
  }

  // Active agent
  if (state.activeAgent) {
    parts.push(`${yellow('◐')} ${magenta(state.activeAgent)}`);
  }

  // Task progress with mini bar (build/validate)
  if (state.tasksTotal > 0) {
    const done = state.tasksCompleted;
    const total = state.tasksTotal;
    const bar = miniProgressBar(done, total, state.tasksFailed);
    const failPart = state.tasksFailed > 0 ? red(` ${state.tasksFailed}✗`) : '';
    parts.push(`${bar} ${label(`${done}/${total}`, colors)}${failPart}`);
  }

  // Stage elapsed time
  if (state.stageStartedAt) {
    const elapsed = Date.now() - new Date(state.stageStartedAt).getTime();
    parts.push(dim(formatElapsed(elapsed)));
  }

  // Total workflow time (shown as dim suffix when different from stage time)
  if (state.startedAt && state.stageStartedAt) {
    const total = Date.now() - new Date(state.startedAt).getTime();
    const stageMs = Date.now() - new Date(state.stageStartedAt).getTime();
    if (total - stageMs > 5000) {
      parts.push(dim(`(${formatElapsed(total)} total)`));
    }
  }

  const firstLine = parts.join(' ');

  // Second line: truncated task description
  const taskDesc = truncateTask(state.task, 60);
  const secondLine = dim(`  └ ${taskDesc}`);

  // Third line: currently in-progress task detail (during build/validate)
  const inProgressTask = getInProgressTask(state.tasks);
  if (inProgressTask) {
    const taskLine = dim(`    ▸ `) + cyan(truncateTask(inProgressTask.description, 55));
    return `${firstLine}\n${secondLine}\n${taskLine}`;
  }

  return `${firstLine}\n${secondLine}`;
}

function getInProgressTask(tasks: Record<string, MotifTask>): MotifTask | null {
  for (const task of Object.values(tasks)) {
    if (task && typeof task === 'object' && task.status === 'in-progress') {
      return task;
    }
  }
  return null;
}

function getStageColor(stage: string): (text: string) => string {
  switch (stage) {
    case 'research': return cyan;
    case 'plan': return yellow;
    case 'build': return magenta;
    case 'validate': return green;
    default: return dim;
  }
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return '<1s';
  const totalSecs = Math.floor(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function miniProgressBar(done: number, total: number, failed: number): string {
  const width = Math.min(total, 10);
  const scale = total > 10 ? total / 10 : 1;
  const filledCount = Math.round(done / scale);
  const failedCount = Math.round(failed / scale);
  const emptyCount = width - filledCount - failedCount;

  const filled = green('█'.repeat(Math.max(0, filledCount)));
  const fail = failed > 0 ? red('█'.repeat(Math.max(0, failedCount))) : '';
  const empty = dim('░'.repeat(Math.max(0, emptyCount)));

  return `${filled}${fail}${empty}`;
}

function truncateTask(task: string, maxLen: number): string {
  if (task.length <= maxLen) return task;
  return task.slice(0, maxLen - 1) + '…';
}
