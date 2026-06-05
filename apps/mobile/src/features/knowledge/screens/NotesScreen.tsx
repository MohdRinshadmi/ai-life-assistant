import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { KnowledgeItem } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { GlassCard } from '@components/ui/GlassCard';
import { useNotesStore } from '../stores/notesStore';

/** Compact "time ago" string for note cards. */
function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface SheetState {
  open: boolean;
  editing: KnowledgeItem | null;
  title: string;
  content: string;
  saving: boolean;
}

const EMPTY_SHEET: SheetState = {
  open: false,
  editing: null,
  title: '',
  content: '',
  saving: false,
};

export function NotesScreen() {
  const { theme } = useTheme();
  const { items, loading, error, query, load, setQuery, create, update, remove } =
    useNotesStore();

  const [sheet, setSheet] = useState<SheetState>(EMPTY_SHEET);

  useEffect(() => {
    load();
    // run once on mount; subsequent reloads are driven by setQuery
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSave = useMemo(
    () => sheet.title.trim().length > 0 && sheet.content.trim().length > 0,
    [sheet.title, sheet.content],
  );

  function openCreate() {
    setSheet({ ...EMPTY_SHEET, open: true });
  }

  function openEdit(item: KnowledgeItem) {
    setSheet({
      open: true,
      editing: item,
      title: item.title,
      content: item.content,
      saving: false,
    });
  }

  function closeSheet() {
    setSheet(EMPTY_SHEET);
  }

  async function handleSave() {
    if (!canSave) return;
    const title = sheet.title.trim();
    const content = sheet.content.trim();
    setSheet((s) => ({ ...s, saving: true }));

    if (sheet.editing) {
      await update(sheet.editing.id, { title, content });
    } else {
      await create({ title, content });
    }

    // Surface any store error that resulted from the mutation.
    const storeError = useNotesStore.getState().error;
    if (storeError) {
      setSheet((s) => ({ ...s, saving: false }));
      Alert.alert('Error', storeError);
      return;
    }
    closeSheet();
  }

  function confirmDelete(item: KnowledgeItem) {
    Alert.alert('Delete note', 'This note will be removed from your AI context too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  }

  function renderNote({ item }: { item: KnowledgeItem }) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => openEdit(item)}>
        <GlassCard borderRadius={16}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.heading }]} numberOfLines={1}>
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Text style={[styles.deleteBtn, { color: theme.colors.error }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardContent, { color: theme.colors.text }]} numberOfLines={3}>
            {item.content}
          </Text>
          <View style={styles.cardFooter}>
            <View style={[styles.badge, { backgroundColor: theme.colors.elevated }]}>
              <Text style={[styles.badgeText, { color: theme.colors.subtle }]}>
                In AI context
              </Text>
            </View>
            <Text style={[styles.dateText, { color: theme.colors.muted }]}>
              {relativeDate(item.updatedAt || item.createdAt)}
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  }

  function renderBody() {
    // Initial load: show skeleton spinner.
    if (loading && items.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centeredText, { color: theme.colors.subtle }]}>
            Loading your notes…
          </Text>
        </View>
      );
    }

    // Error (and nothing cached to show): retry affordance.
    if (error && items.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={[styles.errorTitle, { color: theme.colors.heading }]}>
            Couldn’t load notes
          </Text>
          <Text style={[styles.centeredText, { color: theme.colors.subtle }]}>{error}</Text>
          <TouchableOpacity onPress={load} activeOpacity={0.85} style={styles.retryWrap}>
            <LinearGradient
              colors={theme.colors.gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.heading }]}>
              {query.trim() ? 'No matches' : 'No notes yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.subtle }]}>
              {query.trim()
                ? 'Try a different search.'
                : 'Capture your first thought — your goals, preferences, or anything the AI should remember.'}
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.colors.gradients.backdrop as unknown as string[]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top']}>
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
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={[styles.searchClear, { color: theme.colors.subtle }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {renderBody()}
      </SafeAreaView>

      {/* Floating compose action */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={openCreate}
        style={styles.fabShadow}
        accessibilityLabel="Create note"
      >
        <LinearGradient
          colors={theme.colors.gradients.primary as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Text style={styles.fabPlus}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Create / Edit sheet */}
      <Modal visible={sheet.open} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeSheet}>
        <View style={styles.modalRoot}>
          <LinearGradient
            colors={theme.colors.gradients.backdrop as unknown as string[]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={closeSheet}>
                <Text style={[styles.modalCancel, { color: theme.colors.subtle }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.heading }]}>
                {sheet.editing ? 'Edit Note' : 'New Note'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={sheet.saving || !canSave}>
                {sheet.saving ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.modalSave,
                      { color: theme.colors.primary, opacity: canSave ? 1 : 0.4 },
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={[
                  styles.titleInput,
                  { color: theme.colors.heading, borderBottomColor: theme.colors.border },
                ]}
                placeholder="Title"
                placeholderTextColor={theme.colors.subtle}
                value={sheet.title}
                onChangeText={(title) => setSheet((s) => ({ ...s, title }))}
                maxLength={200}
                autoFocus={!sheet.editing}
              />
              <TextInput
                style={[styles.contentInput, { color: theme.colors.text }]}
                placeholder="Write your note. The AI will use this to personalise its answers…"
                placeholderTextColor={theme.colors.subtle}
                value={sheet.content}
                onChangeText={(content) => setSheet((s) => ({ ...s, content }))}
                multiline
                maxLength={50_000}
                textAlignVertical="top"
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '700' },

  searchWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  searchClear: { fontSize: 14, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  centeredText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  retryWrap: { marginTop: 4 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 11, borderRadius: 22 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120, gap: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '600', fontSize: 16, flex: 1, marginRight: 8 },
  deleteBtn: { fontSize: 15, fontWeight: '600' },
  cardContent: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  dateText: { fontSize: 11, fontWeight: '500' },

  // FAB
  fabShadow: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: { color: '#FFFFFF', fontSize: 30, fontWeight: '300', marginTop: -2 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: '#000000' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, padding: 20, gap: 16 },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentInput: { flex: 1, fontSize: 16, lineHeight: 24 },
});
