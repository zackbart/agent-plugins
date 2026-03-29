import type { RenderContext } from '../../types.js';
import { getModelName, getProviderLabel } from '../../stdin.js';
import { getOutputSpeed } from '../../speed-tracker.js';
import { git as gitColor, gitBranch as gitBranchColor, label, model as modelColor, project as projectColor, red, custom as customColor } from '../colors.js';

export function renderModelElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (display?.showModel === false) {
    return null;
  }

  const model = getModelName(ctx.stdin);
  const providerLabel = getProviderLabel(ctx.stdin);
  const showUsage = display?.showUsage !== false;
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const modelQualifier = providerLabel ?? (showUsage && hasApiKey ? red('API') : undefined);
  // Use unicode │ inside bracket to prevent line-wrapping from splitting the badge
  const modelDisplay = modelQualifier ? `${model} │ ${modelQualifier}` : model;
  return modelColor(`[${modelDisplay}]`, colors);
}

export function renderPathElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (display?.showProject === false || !ctx.stdin.cwd) {
    return null;
  }

  const segments = ctx.stdin.cwd.split(/[/\\]/).filter(Boolean);
  const pathLevels = ctx.config?.pathLevels ?? 1;
  const projectPath = segments.length > 0 ? segments.slice(-pathLevels).join('/') : '/';
  return projectColor(projectPath, colors);
}

export function renderGitElement(ctx: RenderContext): string | null {
  const colors = ctx.config?.colors;
  const gitConfig = ctx.config?.gitStatus;
  const showGit = gitConfig?.enabled ?? true;

  if (!showGit || !ctx.gitStatus) {
    return null;
  }

  const gitParts: string[] = [ctx.gitStatus.branch];

  if ((gitConfig?.showDirty ?? true) && ctx.gitStatus.isDirty) {
    gitParts.push('*');
  }

  if (gitConfig?.showAheadBehind) {
    if (ctx.gitStatus.ahead > 0) {
      gitParts.push(` ↑${ctx.gitStatus.ahead}`);
    }
    if (ctx.gitStatus.behind > 0) {
      gitParts.push(` ↓${ctx.gitStatus.behind}`);
    }
  }

  if (gitConfig?.showFileStats && ctx.gitStatus.fileStats) {
    const { modified, added, deleted, untracked } = ctx.gitStatus.fileStats;
    const statParts: string[] = [];
    if (modified > 0) statParts.push(`!${modified}`);
    if (added > 0) statParts.push(`+${added}`);
    if (deleted > 0) statParts.push(`✘${deleted}`);
    if (untracked > 0) statParts.push(`?${untracked}`);
    if (statParts.length > 0) {
      gitParts.push(` ${statParts.join(' ')}`);
    }
  }

  return `${gitColor('git:(', colors)}${gitBranchColor(gitParts.join(''), colors)}${gitColor(')', colors)}`;
}

export function renderSessionElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (!display?.showSessionName || !ctx.transcript.sessionName) {
    return null;
  }

  return label(ctx.transcript.sessionName, colors);
}

export function renderVersionElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (!display?.showClaudeCodeVersion || !ctx.claudeCodeVersion) {
    return null;
  }

  return label(`CC v${ctx.claudeCodeVersion}`, colors);
}

export function renderSpeedElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (!display?.showSpeed) {
    return null;
  }

  const speed = getOutputSpeed(ctx.stdin);
  if (speed === null) {
    return null;
  }

  return label(`out: ${speed.toFixed(1)} tok/s`, colors);
}

export function renderDurationElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (display?.showDuration === false || !ctx.sessionDuration) {
    return null;
  }

  return label(`⏱️  ${ctx.sessionDuration}`, colors);
}

export function renderCustomLabelElement(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;
  const customLine = display?.customLine;

  if (!customLine) {
    return null;
  }

  return customColor(customLine, colors);
}

export function renderProjectLine(ctx: RenderContext): string | null {
  const colors = ctx.config?.colors;
  const parts: string[] = [];

  const modelPart = renderModelElement(ctx);
  if (modelPart) {
    parts.push(modelPart);
  }

  // path + git are space-joined (not │) when rendered as the project bundle
  const pathPart = renderPathElement(ctx);
  const gitPart = renderGitElement(ctx);
  if (pathPart && gitPart) {
    parts.push(`${pathPart} ${gitPart}`);
  } else if (pathPart) {
    parts.push(pathPart);
  } else if (gitPart) {
    parts.push(gitPart);
  }

  const sessionPart = renderSessionElement(ctx);
  if (sessionPart) {
    parts.push(sessionPart);
  }

  const versionPart = renderVersionElement(ctx);
  if (versionPart) {
    parts.push(versionPart);
  }

  // extraLabel is a residual — only rendered inside the project bundle, not a standalone element
  if (ctx.extraLabel) {
    parts.push(label(ctx.extraLabel, colors));
  }

  const speedPart = renderSpeedElement(ctx);
  if (speedPart) {
    parts.push(speedPart);
  }

  const durationPart = renderDurationElement(ctx);
  if (durationPart) {
    parts.push(durationPart);
  }

  const customPart = renderCustomLabelElement(ctx);
  if (customPart) {
    parts.push(customPart);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' \u2502 ');
}
