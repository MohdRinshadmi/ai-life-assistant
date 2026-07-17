import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Conversation } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@stores/authStore';
import { spacing } from '@theme';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

/**
 * ConversationSidebar — the ChatGPT-style history panel.
 *
 * Search pill on top, "New chat" row, the conversation list (active row
 * highlighted, long-press to delete), and the signed-in user pinned at the
 * bottom. Purely presentational: list data and selection state come from
 * the parent, which decides whether this renders pinned (wide screens) or
 * inside the slide-in drawer (phones).
 */
export function ConversationSidebar({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  function confirmDelete(conversation: Conversation) {
    Alert.alert('Delete chat?', `"${conversation.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(conversation.id) },
    ]);
  }

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={[styles.searchPill, { backgroundColor: theme.colors.surface }]}>
        <Icon name="search" size={16} color={theme.colors.subtle} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={theme.colors.subtle}
          returnKeyType="search"
          accessibilityLabel="Search chats"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={16} color={theme.colors.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {/* New chat */}
      <TouchableOpacity
        style={styles.newChatRow}
        onPress={onNewChat}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Start a new chat"
      >
        <Icon name="create-outline" size={20} color={theme.colors.heading} />
        <Text style={[styles.newChatText, { color: theme.colors.heading }]}>New chat</Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={[styles.sectionLabel, { color: theme.colors.subtle }]}>Chats</Text>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.subtle} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = item.id === activeId;
            return (
              <TouchableOpacity
                style={[styles.row, isActive && { backgroundColor: theme.colors.surface }]}
                onPress={() => onSelect(item.id)}
                onLongPress={() => confirmDelete(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Open chat: ${item.title}. Long press to delete.`}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.rowTitle,
                    { color: isActive ? theme.colors.heading : theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.subtle }]}>
              {query ? 'No chats match your search.' : 'No chats yet — start one below.'}
            </Text>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Signed-in user */}
      {user && (
        <View style={[styles.profileRow, { borderTopColor: theme.colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.elevated }]}>
            <Text style={[styles.avatarInitial, { color: theme.colors.heading }]}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            style={[styles.profileName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {user.displayName}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  newChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xs,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  empty: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
