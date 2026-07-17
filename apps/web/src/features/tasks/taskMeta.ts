import type { TaskPriority, TaskStatus } from '@ai-life/shared';

/**
 * Semantic colors for task metadata — all reference theme tokens so the
 * palette stays consistent (previously a stray #22C55E green competed
 * with --success).
 */
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: 'var(--error)',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'var(--subtle)',
  in_progress: 'var(--info)',
  completed: 'var(--success)',
  cancelled: 'var(--error)',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
