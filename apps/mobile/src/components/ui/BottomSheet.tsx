import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional action rendered on the right of the header (e.g. a Save button). */
  headerRight?: React.ReactNode;
}

const CLOSE_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * BottomSheet — Modal-based sheet that slides up from the bottom over a dark
 * overlay: elevated violet-tinted surface, 2xl top radius, drag handle,
 * title row with a close affordance, and keyboard avoidance built in.
 */
export function BottomSheet({ visible, onClose, title, children, headerRight }: Props) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close sheet"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.elevated,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.borderRadius['2xl'],
              borderTopRightRadius: theme.borderRadius['2xl'],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.heading }]}>{title}</Text>
            <View style={styles.headerActions}>
              {headerRight}
              <TouchableOpacity
                onPress={onClose}
                hitSlop={CLOSE_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={[styles.close, { color: theme.colors.subtle }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  dismissArea: { flex: 1 },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  close: { fontSize: 16, fontWeight: '600' },
});
