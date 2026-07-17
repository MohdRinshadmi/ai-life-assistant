import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface Props extends TextInputProps {
  /** Optional label rendered above the field. */
  label?: string;
  /** Error message rendered below the field; also turns the border red. */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * TextField — the shared dark input used by the auth screens:
 * 52pt tall, large radius, elevated violet-tinted fill, hairline border that
 * turns primary on focus (or error-red when invalid).
 */
export function TextField({
  label,
  error,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...inputProps
}: Props) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.subtle }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.elevated,
            borderColor,
            borderRadius: theme.borderRadius.lg,
            height: theme.layout.inputHeight,
          },
        ]}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={label ?? inputProps.placeholder}
          placeholderTextColor={theme.colors.subtle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, { color: theme.colors.heading }, style]}
        />
      </View>
      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrap: { borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  input: { fontSize: 15, paddingVertical: 0 },
  error: { fontSize: 12, marginTop: 4, marginLeft: 4 },
});
