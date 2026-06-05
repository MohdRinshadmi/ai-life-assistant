import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';
import { GlassCard } from '@components/ui/GlassCard';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest } from '@ai-life/shared';
import { useTasksStore, StatusFilter } from '../stores/tasksStore';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high'];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
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

const formatDue = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export function TasksScreen() {
  const { theme } = useTheme();
  const tasks = useTasksStore((s) => s.tasks);
  const statusFilter = useTasksStore((s) => s.statusFilter);
  const loading = useTasksStore((s) => s.loading);
  const error = useTasksStore((s) => s.error);
  const load = useTasksStore((s) => s.load);
  const create = useTasksStore((s) => s.create);
  const toggleComplete = useTasksStore((s) => s.toggleComplete);
  const remove = useTasksStore((s) => s.remove);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void load('all');
  }, [load]);

  const onSelectFilter = useCallback(
    (value: StatusFilter) => {
      void load(value);
    },
    [load],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmDelete = useCallback(
    (task: Task) => {
      Alert.alert('Delete task', `"${task.title}" will be removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(task.id) },
      ]);
    },
    [remove],
  );

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskRow
        task={item}
        theme={theme}
        onToggle={() => void toggleComplete(item.id)}
        onDelete={() => confirmDelete(item)}
      />
    ),
    [theme, toggleComplete, confirmDelete],
  );

  const showEmpty = !loading && !error && tasks.length === 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.colors.gradients.backdrop as unknown as string[]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.heading }]}>Tasks</Text>
            <Text style={[styles.subtitle, { color: theme.colors.subtle }]}>
              Plan your day, stay on track
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCreate(true)}>
            <LinearGradient
              colors={theme.colors.gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                activeOpacity={0.8}
                onPress={() => onSelectFilter(f.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#FFFFFF' : theme.colors.subtle },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Body */}
        {loading && tasks.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error && tasks.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.stateTitle, { color: theme.colors.heading }]}>
              Something went wrong
            </Text>
            <Text style={[styles.stateSub, { color: theme.colors.subtle }]}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : showEmpty ? (
          <View style={styles.centered}>
            <Text style={[styles.stateTitle, { color: theme.colors.heading }]}>
              No tasks
            </Text>
            <Text style={[styles.stateSub, { color: theme.colors.subtle }]}>
              No tasks — plan your day
            </Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>

      <CreateTaskSheet
        visible={showCreate}
        theme={theme}
        onClose={() => setShowCreate(false)}
        onCreate={create}
      />
    </View>
  );
}

/* ── Task row ─────────────────────────────────────────────── */

interface TaskRowProps {
  task: Task;
  theme: ReturnType<typeof useTheme>['theme'];
  onToggle: () => void;
  onDelete: () => void;
}

function TaskRow({ task, theme, onToggle, onDelete }: TaskRowProps) {
  const isDone = task.status === 'completed';
  const status = STATUS_META[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <GlassCard borderRadius={16} style={styles.cardSpacing}>
      <View style={styles.cardRow}>
        <TouchableOpacity
          onPress={onToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.checkbox,
            {
              borderColor: isDone ? theme.colors.success : theme.colors.border,
              backgroundColor: isDone ? theme.colors.success : 'transparent',
            },
          ]}
        >
          {isDone && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColor + '22', borderColor: priorityColor + '66' },
              ]}
            >
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {task.priority}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.color + '22', borderColor: status.color + '55' },
              ]}
            >
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>

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

/* ── Create sheet ─────────────────────────────────────────── */

interface CreateSheetProps {
  visible: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  onClose: () => void;
  onCreate: (payload: CreateTaskRequest) => Promise<Task | null>;
}

const DUE_PRESETS: { label: string; offsetDays: number | null }[] = [
  { label: 'None', offsetDays: null },
  { label: 'Today', offsetDays: 0 },
  { label: 'Tomorrow', offsetDays: 1 },
  { label: 'Next week', offsetDays: 7 },
];

function CreateTaskSheet({ visible, theme, onClose, onCreate }: CreateSheetProps) {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}>
          <View style={styles.sheetHandle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.sheetTitle, { color: theme.colors.heading }]}>New Task</Text>

            <Text style={[styles.label, { color: theme.colors.subtle }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor={theme.colors.muted}
              autoFocus
              maxLength={200}
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
            />

            <Text style={[styles.label, { color: theme.colors.subtle }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add details (optional)"
              placeholderTextColor={theme.colors.muted}
              multiline
              maxLength={1000}
              style={[
                styles.input,
                styles.inputMultiline,
                { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
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
                    style={[
                      styles.optionPill,
                      { borderColor: c, backgroundColor: active ? c : 'transparent' },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: active ? '#FFFFFF' : c }]}>
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
                    style={[
                      styles.duePill,
                      {
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? '#FFFFFF' : theme.colors.subtle },
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
              >
                <Text style={{ color: theme.colors.subtle, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => void submit()}
                disabled={!canSubmit}
                style={[styles.actionBtn, styles.actionPrimaryWrap, { opacity: canSubmit ? 1 : 0.5 }]}
              >
                <LinearGradient
                  colors={theme.colors.gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 8 },
  stateTitle: { fontSize: 18, fontWeight: '700' },
  stateSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 8 },

  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  cardSpacing: { marginBottom: 10 },

  cardRow: { flexDirection: 'row', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  cardBody: { flex: 1, gap: 6 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  struck: { textDecorationLine: 'line-through' },
  delete: { fontSize: 14, paddingHorizontal: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '600' },
  due: { fontSize: 12, fontWeight: '500' },

  // Modal / sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayDismiss: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionPrimaryWrap: { borderWidth: 0, padding: 0, overflow: 'hidden' },
  actionPrimaryFill: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  actionPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
