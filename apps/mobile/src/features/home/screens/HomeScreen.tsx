import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';

export function HomeScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[theme.textStyles.h2, { color: theme.colors.heading }]}>
          Good Morning 👋
        </Text>
        <Text style={[theme.textStyles.body, { color: theme.colors.subtle, marginTop: 4 }]}>
          How can I help you today?
        </Text>
      </View>
      {/* TODO: Dashboard cards, quick actions, recent conversations */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
});
