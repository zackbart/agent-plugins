import type { RenderContext } from '../../types.js';
import { green, red, dim } from '../colors.js';

export function renderDiffElement(ctx: RenderContext): string | null {
  const diffStats = ctx.gitStatus?.diffStats;
  if (!diffStats) return null;

  const parts: string[] = [];
  if (diffStats.insertions > 0) parts.push(green(`+${diffStats.insertions}`));
  if (diffStats.deletions > 0) parts.push(red(`-${diffStats.deletions}`));

  if (parts.length === 0) return null;

  return `${dim('diff')} ${parts.join(' ')}`;
}
