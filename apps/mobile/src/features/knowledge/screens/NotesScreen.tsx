import React, { useState, useEffect, useCallback } from 'react';
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
import { KnowledgeItem } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { knowledgeService } from '../services/knowledgeService';

export function NotesScreen() {
  const { theme } = useTheme();
  const [notes, setNotes] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await knowledgeService.list();
      setNotes(items);
    } catch {
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    try {
      setIsSaving(true);
      const item = await knowledgeService.create({ title: title.trim(), content: content.trim() });
      setNotes((prev) => [item, ...prev]);
      setTitle('');
      setContent('');
      setIsModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete note', 'This note will be removed from your AI context too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await knowledgeService.delete(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  }

  function renderNote({ item }: { item: KnowledgeItem }) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.heading }]} numberOfLines={1}>
            {item.title}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={[styles.deleteBtn, { color: theme.colors.error }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.cardContent, { color: theme.colors.text }]} numberOfLines={3}>
          {item.content}
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.colors.elevated }]}>
          <Text style={[styles.badgeText, { color: theme.colors.subtle }]}>📚 In AI context</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[theme.textStyles.h3, { color: theme.colors.heading }]}>My Notes</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={notes.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.heading }]}>No notes yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.subtle }]}>
                Add notes about yourself — your goals, preferences, health info, daily schedule — and the AI will use them to give you personalised answers.
              </Text>
            </View>
          }
        />
      )}

      {/* Add Note Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: theme.colors.bg }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: theme.colors.subtle }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.heading }]}>New Note</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving || !title.trim() || !content.trim()}>
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: theme.colors.primary, opacity: title.trim() && content.trim() ? 1 : 0.4 }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={[styles.titleInput, { color: theme.colors.heading, borderBottomColor: theme.colors.border }]}
              placeholder="Title"
              placeholderTextColor={theme.colors.subtle}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              autoFocus
            />
            <TextInput
              style={[styles.contentInput, { color: theme.colors.text }]}
              placeholder="Write your note here. The AI will use this to personalise its answers..."
              placeholderTextColor={theme.colors.subtle}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={50_000}
              textAlignVertical="top"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '600', fontSize: 16, flex: 1, marginRight: 8 },
  deleteBtn: { fontSize: 16, fontWeight: '600' },
  cardContent: { fontSize: 14, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '500' },
  // Modal
  modal: { flex: 1 },
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
