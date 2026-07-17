import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KnowledgeItem } from '@ai-life/shared';
import { useTheme } from '@hooks/useTheme';
import { GlassCard } from '@components/ui';
import { spacing } from '@theme';

const DELETE_HIT_SLOP = { top: 10, right: 10, bottom: 10, left: 10 };

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

interface Props {
  item: KnowledgeItem;
  onPress: () => void;
  onDelete: () => void;
}

/**
 * NoteCard — a knowledge note preview: title, 3-line excerpt,
 * "In AI context" badge and a relative timestamp.
 */
export function NoteCard({ item, onPress, onDelete }: Props) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit note ${item.title}`}
    >
      <GlassCard borderRadius={16}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.heading }]} numberOfLines={1}>
            {item.title}
          </Text>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={DELETE_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Delete note ${item.title}`}
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

const styles = StyleSheet.create({
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '600', fontSize: 16, flex: 1, marginRight: spacing.sm },
  deleteBtn: { fontSize: 15, fontWeight: '600' },
  cardContent: { fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  badge: { paddingHorizontal: 10, paddingVertical: spacing.xs, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  dateText: { fontSize: 11, fontWeight: '500' },
});
