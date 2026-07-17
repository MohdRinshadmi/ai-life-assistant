import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Task, TaskPriority, CreateTaskRequest } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { BottomSheet } from '@components/ui';
import { spacing } from '@theme';
import { PRIORITY_COLORS } from './TaskRow';

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high'];

const DUE_PRESETS: { label: string; offsetDays: number | null }[] = [
  { label: 'None', offsetDays: null },
  { label: 'Today', offsetDays: 0 },
  { label: 'Tomorrow', offsetDays: 1 },
  { label: 'Next week', offsetDays: 7 },
];

const GRADIENT_START = { x: 0, y: 0.5 };
const GRADIENT_END = { x: 1, y: 0.5 };

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (payload: CreateTaskRequest) => Promise<Task | null>;
}

/**
 * CreateTaskSheet — bottom sheet form for a new task:
 * title, optional description, priority pills and quick due-date presets.
 */
export function CreateTaskSheet({ visible, onClose, onCreate }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueOffset, setDueOffset] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueOffset(null);
    setSubmitting(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const dueDate = useMemo(() => {
    if (dueOffset === null) return undefined;
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + dueOffset);
    return d.toISOString();
  }, [dueOffset]);

  const canSubmit = title.trim().length > 0 && !submitting;

  const submit = useCallback(async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    const payload: CreateTaskRequest = {
      title: title.trim(),
      priority,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(dueDate ? { dueDate } : {}),
    };
    const created = await onCreate(payload);
    setSubmitting(false);
    if (created) {
      reset();
      onClose();
    } else {
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  }, [title, description, priority, dueDate, onCreate, reset, onClose]);

  const inputTheme = {
    color: theme.colors.text,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  };

  return (
    <BottomSheet visible={visible} onClose={close} title="New Task">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: theme.colors.subtle }]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What needs to be done?"
          placeholderTextColor={theme.colors.muted}
          autoFocus
          maxLength={200}
          accessibilityLabel="Task title"
          style={[styles.input, inputTheme]}
        />

        <Text style={[styles.label, { color: theme.colors.subtle }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add details (optional)"
          placeholderTextColor={theme.colors.muted}
          multiline
          maxLength={1000}
          accessibilityLabel="Task description"
          style={[styles.input, styles.inputMultiline, inputTheme]}
        />

        <Text style={[styles.label, { color: theme.colors.subtle }]}>Priority</Text>
        <View style={styles.optionRow}>
          {PRIORITY_OPTIONS.map((p) => {
            const active = priority === p;
            const c = PRIORITY_COLORS[p];
            return (
              <TouchableOpacity
                key={p}
                activeOpacity={0.8}
                onPress={() => setPriority(p)}
                accessibilityRole="button"
                accessibilityLabel={`Priority ${p}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.optionPill,
                  { borderColor: c },
                  active
                    ? { backgroundColor: c }
                    : { backgroundColor: theme.colors.transparent },
                ]}
              >
                <Text style={[styles.optionText, active ? styles.optionTextActive : { color: c }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.colors.subtle }]}>Due date</Text>
        <View style={styles.optionRow}>
          {DUE_PRESETS.map((d) => {
            const active = dueOffset === d.offsetDays;
            return (
              <TouchableOpacity
                key={d.label}
                activeOpacity={0.8}
                onPress={() => setDueOffset(d.offsetDays)}
                accessibilityRole="button"
                accessibilityLabel={`Due ${d.label}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.duePill,
                  active
                    ? { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }
                    : { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    active ? styles.optionTextActive : { color: theme.colors.subtle },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.colors.border }]}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.actionCancelText, { color: theme.colors.subtle }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Create task"
            accessibilityState={{ disabled: !canSubmit, busy: submitting }}
            style={[
              styles.actionBtn,
              styles.actionPrimaryWrap,
              canSubmit ? styles.enabled : styles.dimmed,
            ]}
          >
            <LinearGradient
              colors={theme.colors.gradients.primary}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.actionPrimaryFill}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionPrimaryText}>Create Task</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionPill: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  duePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: { fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: '#FFFFFF' },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionCancelText: { fontWeight: '600' },
  actionPrimaryWrap: { borderWidth: 0, padding: 0, overflow: 'hidden' },
  actionPrimaryFill: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  enabled: { opacity: 1 },
  dimmed: { opacity: 0.5 },
});
