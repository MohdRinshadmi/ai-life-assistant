import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Task, TaskStatus, TaskPriority } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { Badge, Checkbox, GlassCard } from '@components/ui';
import { spacing } from '@theme';

/** Shared priority hues (also used by the create sheet's priority pills). */
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
};

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#9A8AB8' },
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  completed: { label: 'Completed', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#EF4444' },
};

const DELETE_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const formatDue = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface Props {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}

/**
 * TaskRow — a single task card: completion checkbox, title/description,
 * priority + status badges and an optional due date.
 */
export function TaskRow({ task, onToggle, onDelete }: Props) {
  const { theme } = useTheme();
  const isDone = task.status === 'completed';
  const status = STATUS_META[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <GlassCard borderRadius={16} style={styles.cardSpacing}>
      <View style={styles.cardRow}>
        <Checkbox
          checked={isDone}
          onPress={onToggle}
          accessibilityLabel={isDone ? 'Mark task as not done' : 'Mark task as done'}
          style={styles.checkbox}
        />

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text
              numberOfLines={2}
              style={[
                styles.cardTitle,
                { color: isDone ? theme.colors.subtle : theme.colors.text },
                isDone && styles.struck,
              ]}
            >
              {task.title}
            </Text>
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={DELETE_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Delete task ${task.title}`}
            >
              <Text style={[styles.delete, { color: theme.colors.subtle }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {task.description ? (
            <Text
              numberOfLines={2}
              style={[
                styles.cardDesc,
                { color: theme.colors.subtle },
                isDone && styles.struck,
              ]}
            >
              {task.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Badge label={task.priority} color={priorityColor} dot />
            <Badge label={status.label} color={status.color} />
            {task.dueDate ? (
              <Text style={[styles.due, { color: theme.colors.muted }]}>
                Due {formatDue(task.dueDate)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  cardSpacing: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', gap: spacing.md },
  checkbox: { marginTop: 1 },
  cardBody: { flex: 1, gap: 6 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  struck: { textDecorationLine: 'line-through' },
  delete: { fontSize: 14, paddingHorizontal: spacing['2xs'] },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing['2xs'],
  },
  due: { fontSize: 12, fontWeight: '500' },
});
