import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';

/**
 * Reusable Input component with label, error state, and icon support.
 */
interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <Text style={[theme.textStyles.label, { color: theme.colors.subtle, marginBottom: 6 }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.elevated,
            borderColor: error ? theme.colors.error : theme.colors.border,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.base,
            height: theme.layout.inputHeight,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error ? (
        <Text style={[theme.textStyles.small, { color: theme.colors.error, marginTop: 4 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Primary button with loading state.
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  const { theme } = useTheme();

  const isDisabled = disabled || loading;

  const buttonStyles: ViewStyle = {
    ...(variant === 'primary' && {
      backgroundColor: isDisabled ? theme.colors.muted : theme.colors.primary,
    }),
    ...(variant === 'outline' && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: isDisabled ? theme.colors.muted : theme.colors.primary,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
  };

  const textColor =
    variant === 'primary'
      ? theme.colors.white
      : isDisabled
        ? theme.colors.muted
        : theme.colors.primary;

  return (
    <TouchableOpacity
      style={[styles.button, { height: theme.layout.buttonHeight, borderRadius: theme.borderRadius.lg }, buttonStyles, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <Text style={[theme.textStyles.button, { color: textColor }]}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
