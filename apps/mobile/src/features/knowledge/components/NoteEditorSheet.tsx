import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { KnowledgeItem } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { BottomSheet } from '@components/ui';
import { spacing } from '@theme';

interface Props {
  visible: boolean;
  /** Note being edited, or null when composing a new one. */
  editing: KnowledgeItem | null;
  onClose: () => void;
  /** Persist the note. Resolve `true` to close the sheet, `false` to keep it open. */
  onSave: (payload: { title: string; content: string }) => Promise<boolean>;
}

/**
 * NoteEditorSheet — bottom sheet for creating/editing a knowledge note:
 * underlined title field plus a tall free-form content area, with the Save
 * action (or a spinner while persisting) in the sheet header.
 */
export function NoteEditorSheet({ visible, editing, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Re-seed the fields each time the sheet opens (fresh or with a note to edit).
  useEffect(() => {
    if (visible) {
      setTitle(editing?.title ?? '');
      setContent(editing?.content ?? '');
      setSaving(false);
    }
  }, [visible, editing]);

  const canSave = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0,
    [title, content],
  );

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const shouldClose = await onSave({ title: title.trim(), content: content.trim() });
    setSaving(false);
    if (shouldClose) onClose();
  };

  const saveAction = saving ? (
    <ActivityIndicator size="small" color={theme.colors.primary} />
  ) : (
    <TouchableOpacity
      onPress={handleSave}
      disabled={!canSave}
      accessibilityRole="button"
      accessibilityLabel="Save note"
      accessibilityState={{ disabled: !canSave }}
    >
      <Text
        style={[
          styles.save,
          { color: theme.colors.primary },
          canSave ? styles.saveEnabled : styles.saveDisabled,
        ]}
      >
        Save
      </Text>
    </TouchableOpacity>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit Note' : 'New Note'}
      headerRight={saveAction}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TextInput
          style={[
            styles.titleInput,
            { color: theme.colors.heading, borderBottomColor: theme.colors.border },
          ]}
          placeholder="Title"
          placeholderTextColor={theme.colors.subtle}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          autoFocus={!editing}
          accessibilityLabel="Note title"
        />
        <TextInput
          style={[styles.contentInput, { color: theme.colors.text }]}
          placeholder="Write your note. The AI will use this to personalise its answers…"
          placeholderTextColor={theme.colors.subtle}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={50_000}
          textAlignVertical="top"
          accessibilityLabel="Note content"
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  save: { fontSize: 16, fontWeight: '600' },
  saveEnabled: { opacity: 1 },
  saveDisabled: { opacity: 0.4 },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    paddingBottom: spacing.md,
    marginTop: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 220,
    marginTop: spacing.base,
    paddingBottom: spacing.xl,
  },
});
