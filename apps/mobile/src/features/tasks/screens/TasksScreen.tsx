import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Chip, PillButton, ScreenContainer, StateView } from '@components/ui';
import { Task } from '@ai-life/shared';
import { spacing } from '@theme';
import { useTasksStore, StatusFilter } from '../stores/tasksStore';
import { TaskRow } from '../components/TaskRow';
import { CreateTaskSheet } from '../components/CreateTaskSheet';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

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
    // Store actions resolve internally (errors land in store state) — safe to fire-and-forget.
    load('all');
  }, [load]);

  const onSelectFilter = useCallback(
    (value: StatusFilter) => {
      load(value);
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
        { text: 'Delete', style: 'destructive', onPress: () => remove(task.id) },
      ]);
    },
    [remove],
  );

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskRow
        task={item}
        onToggle={() => toggleComplete(item.id)}
        onDelete={() => confirmDelete(item)}
      />
    ),
    [toggleComplete, confirmDelete],
  );

  const showEmpty = !loading && !error && tasks.length === 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.heading }]}>Tasks</Text>
          <Text style={[styles.subtitle, { color: theme.colors.subtle }]}>
            Plan your day, stay on track
          </Text>
        </View>
        <PillButton title="+ New" size="sm" onPress={() => setShowCreate(true)} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            onPress={() => onSelectFilter(f.value)}
          />
        ))}
      </View>

      {/* Body */}
      {loading && tasks.length === 0 ? (
        <StateView variant="loading" />
      ) : error && tasks.length === 0 ? (
        <StateView
          variant="error"
          title="Something went wrong"
          description={error}
          actionLabel="Try again"
          onAction={() => load()}
        />
      ) : showEmpty ? (
        <StateView variant="empty" title="No tasks" description="No tasks — plan your day" />
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
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      <CreateTaskSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={create}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginTop: spacing['2xs'] },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
  },
});
