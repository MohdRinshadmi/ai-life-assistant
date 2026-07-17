import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@hooks/useTheme';

type Variant = 'loading' | 'empty' | 'error';

interface Props {
  variant: Variant;
  title?: string;
  description?: string;
  /** Label for the action button (usually "Try again"). Rendered when set with onAction. */
  actionLabel?: string;
  onAction?: () => void;
}

const GRADIENT_START = { x: 0, y: 0.5 };
const GRADIENT_END = { x: 1, y: 0.5 };

/**
 * StateView — unified centered block for loading / empty / error states.
 * Loading shows a spinner (plus optional caption); empty and error show a
 * title + description, with an optional gradient retry pill.
 */
export function StateView({ variant, title, description, actionLabel, onAction }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.container} accessibilityLabel={title ?? variant}>
      {variant === 'loading' && (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      )}
      {title && variant !== 'loading' ? (
        <Text style={[styles.title, { color: theme.colors.heading }]}>{title}</Text>
      ) : null}
      {description ? (
        <Text style={[styles.description, { color: theme.colors.subtle }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.actionWrap}
        >
          <LinearGradient
            colors={theme.colors.gradients.primary}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.actionPill}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  actionWrap: { marginTop: 4 },
  actionPill: { paddingHorizontal: 28, paddingVertical: 11, borderRadius: 22 },
  actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
