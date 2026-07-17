import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { KnowledgeItem } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { Fab, ScreenContainer, StateView } from '@components/ui';
import { spacing } from '@theme';
import { useNotesStore } from '../stores/notesStore';
import { NoteCard } from '../components/NoteCard';
import { NoteEditorSheet } from '../components/NoteEditorSheet';

const CLEAR_HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };

export function NotesScreen() {
  const { theme } = useTheme();
  const { items, loading, error, query, load, setQuery, create, update, remove } =
    useNotesStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);

  useEffect(() => {
    load();
    // run once on mount; subsequent reloads are driven by setQuery
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((item: KnowledgeItem) => {
    setEditing(item);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => setEditorOpen(false), []);

  const handleSave = useCallback(
    async ({ title, content }: { title: string; content: string }) => {
      if (editing) {
        await update(editing.id, { title, content });
      } else {
        await create({ title, content });
      }
      // Surface any store error that resulted from the mutation.
      const storeError = useNotesStore.getState().error;
      if (storeError) {
        Alert.alert('Error', storeError);
        return false;
      }
      return true;
    },
    [editing, update, create],
  );

  const confirmDelete = useCallback(
    (item: KnowledgeItem) => {
      Alert.alert('Delete note', 'This note will be removed from your AI context too.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
      ]);
    },
    [remove],
  );

  const renderNote = useCallback(
    ({ item }: { item: KnowledgeItem }) => (
      <NoteCard item={item} onPress={() => openEdit(item)} onDelete={() => confirmDelete(item)} />
    ),
    [openEdit, confirmDelete],
  );

  function renderBody() {
    // Initial load: show skeleton spinner.
    if (loading && items.length === 0) {
      return <StateView variant="loading" description="Loading your notes…" />;
    }

    // Error (and nothing cached to show): retry affordance.
    if (error && items.length === 0) {
      return (
        <StateView
          variant="error"
          title="Couldn’t load notes"
          description={error}
          actionLabel="Retry"
          onAction={load}
        />
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        keyboardShouldPersistTaps="handled"
        refreshing={loading && items.length > 0}
        onRefresh={load}
        ListEmptyComponent={
          <StateView
            variant="empty"
            title={query.trim() ? 'No matches' : 'No notes yet'}
            description={
              query.trim()
                ? 'Try a different search.'
                : 'Capture your first thought — your goals, preferences, or anything the AI should remember.'
            }
          />
        }
      />
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.heading }]}>Notes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchField,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.searchIcon, { color: theme.colors.subtle }]}>⌕</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search your notes"
            placeholderTextColor={theme.colors.subtle}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search your notes"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={CLEAR_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={[styles.searchClear, { color: theme.colors.subtle }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderBody()}

      {/* Floating compose action */}
      <Fab icon="add" onPress={openCreate} accessibilityLabel="Create note" />

      {/* Create / Edit sheet */}
      <NoteEditorSheet
        visible={editorOpen}
        editing={editing}
        onClose={closeEditor}
        onSave={handleSave}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },

  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  searchClear: { fontSize: 14, fontWeight: '600' },

  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 120,
    gap: spacing.md,
  },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
