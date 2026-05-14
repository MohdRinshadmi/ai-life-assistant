import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { taskService } from '../taskService';
import { Task, TaskStatus, TaskPriority } from '@ai-life/shared';

const STATUS_FILTERS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'completed' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
};

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high'];

export function TasksScreen() {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [creating, setCreating] = useState(false);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await taskService.list(filter);
      setTasks(data);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const handleToggleStatus = useCallback(async (task: Task) => {
    const nextStatus: TaskStatus =
      task.status === 'pending' ? 'in_progress'
      : task.status === 'in_progress' ? 'completed'
      : 'pending';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    try {
      await taskService.update(task.id, { status: nextStatus });
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  }, []);

  const handleDelete = useCallback((task: Task) => {
    Alert.alert('Delete Task', `"${task.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          try {
            await taskService.remove(task.id);
          } catch {
            void fetchTasks();
          }
        },
      },
    ]);
  }, [fetchTasks]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const task = await taskService.create({ title: newTitle.trim(), priority: newPriority });
      setTasks((prev) => [task, ...prev]);
      setShowCreate(false);
      setNewTitle('');
      setNewPriority('medium');
    } catch {
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [newTitle, newPriority]);

  const renderTask = ({ item }: { item: Task }) => {
    const isDone = item.status === 'completed';
    return (
      <View style={[styles.taskCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Priority stripe */}
        <View style={[styles.priorityStripe, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />

        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <TouchableOpacity
              style={[
                styles.statusCircle,
                {
                  borderColor: isDone ? theme.colors.success : theme.colors.border,
                  backgroundColor: isDone ? theme.colors.success : 'transparent',
                },
              ]}
              onPress={() => void handleToggleStatus(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isDone && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <Text
              style={[
                styles.taskTitle,
                { color: theme.colors.text },
                isDone && { textDecorationLine: 'line-through', color: theme.colors.subtle },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>

          <View style={styles.taskMeta}>
            <StatusBadge status={item.status} theme={theme} />
            {item.dueDate && (
              <Text style={[styles.dueDate, { color: theme.colors.subtle }]}>
                Due {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            )}
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.deleteBtn, { color: theme.colors.subtle }]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[theme.textStyles.h3, { color: theme.colors.heading }]}>Tasks</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter pills */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : theme.colors.subtle }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Task list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.colors.subtle }]}>{error}</Text>
          <TouchableOpacity onPress={() => void fetchTasks()} style={styles.retryBtn}>
            <Text style={{ color: theme.colors.primary }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          renderItem={renderTask}
          contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchTasks(true)}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.heading }]}>No tasks yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.subtle }]}>
                Tap "+ New" or ask your AI assistant to create one.
              </Text>
            </View>
          }
        />
      )}

      {/* Create Task Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.heading }]}>New Task</Text>

            <TextInput
              style={[styles.modalInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.bg }]}
              placeholder="What needs to be done?"
              placeholderTextColor={theme.colors.subtle}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              multiline
              maxLength={500}
            />

            <Text style={[styles.modalLabel, { color: theme.colors.subtle }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityPill,
                    {
                      backgroundColor: newPriority === p ? PRIORITY_COLORS[p] : theme.colors.bg,
                      borderColor: PRIORITY_COLORS[p],
                    },
                  ]}
                  onPress={() => setNewPriority(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.priorityText, { color: newPriority === p ? '#FFFFFF' : PRIORITY_COLORS[p] }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: theme.colors.border }]}
                onPress={() => { setShowCreate(false); setNewTitle(''); }}
              >
                <Text style={{ color: theme.colors.subtle }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={() => void handleCreate()}
                disabled={creating || !newTitle.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBadge({ status, theme }: { status: TaskStatus; theme: ReturnType<typeof useTheme>['theme'] }) {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Done',
    cancelled: 'Cancelled',
  };
  const colors: Record<TaskStatus, string> = {
    pending: '#6B7280',
    in_progress: '#3B82F6',
    completed: '#22C55E',
    cancelled: '#EF4444',
  };
  return (
    <View style={[styles.badge, { backgroundColor: colors[status] + '22', borderColor: colors[status] + '55' }]}>
      <Text style={[styles.badgeText, { color: colors[status] }]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8 },
  // Task card
  taskCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  priorityStripe: { width: 4 },
  taskContent: { flex: 1, padding: 12, gap: 8 },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkmark: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 32 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dueDate: { fontSize: 12, flex: 1 },
  deleteBtn: { fontSize: 14, paddingHorizontal: 4 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalLabel: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    maxHeight: 120,
  },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnPrimaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
