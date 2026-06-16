import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@stores/authStore';
import { GlassCard } from '@components/ui/GlassCard';

const ACTIONS: { key: string; title: string; subtitle: string; icon: string }[] = [
  { key: 'chat',      title: 'Start a Chat',     subtitle: 'Ask anything',    icon: 'chatbubble-ellipses' },
  { key: 'note',      title: 'Capture a Note',   subtitle: 'Save to memory',  icon: 'document-text' },
  { key: 'task',      title: 'Create a Task',    subtitle: 'Plan your day',   icon: 'checkbox' },
  { key: 'voice',     title: 'Voice Command',    subtitle: 'Hands-free',      icon: 'mic' },
];

const ROUTE_FOR: Record<string, string> = {
  chat: 'Chat',
  note: 'Notes',
  task: 'Tasks',
  voice: 'Chat',
};

export function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.displayName ?? 'there').split(' ')[0];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.colors.gradients.backdrop as unknown as string[]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient
                colors={theme.colors.gradients.primarySoft as unknown as string[]}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                style={styles.tryPremiumWrap}
              >
                <View style={[styles.tryPremiumInner, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.tryPremiumText, { color: theme.colors.heading }]}>Try Premium</Text>
                  <Icon name="add" size={14} color={theme.colors.heading} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.avatarWrap}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={theme.colors.gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}
                >
                  <Text style={styles.avatarInitial}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={[styles.greeting, { color: theme.colors.heading }]}>
              Hi {firstName},
            </Text>
            <Text style={[styles.greetingSub, { color: theme.colors.subtle }]}>
              Give any command naturally, from{'\n'}generating notes to scheduling tasks
            </Text>
          </View>

          {/* Aurora swoosh banner */}
          <View style={styles.aurora}>
            <LinearGradient
              colors={['rgba(139,0,255,0.0)', 'rgba(139,0,255,0.55)', 'rgba(255,0,140,0.55)', 'rgba(0,0,0,0.0)']}
              start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Action grid */}
          <View style={styles.grid}>
            {ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.key}
                activeOpacity={0.85}
                style={styles.gridItem}
                onPress={() => navigation.navigate(ROUTE_FOR[a.key])}
              >
                <GlassCard borderRadius={18} style={{ flex: 1 }}>
                  <View style={styles.cardContent}>
                    <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(139,0,255,0.18)' }]}>
                      <Icon name={a.icon} size={16} color={theme.colors.accent} />
                    </View>
                    <View style={{ marginTop: 'auto' }}>
                      <Text style={[styles.cardTitle, { color: theme.colors.heading }]}>{a.title}</Text>
                      <Text style={[styles.cardSubtitle, { color: theme.colors.subtle }]}>{a.subtitle}</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          {/* Voice CTA bar */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Chat')}
            style={styles.ctaShadow}
          >
            <LinearGradient
              colors={theme.colors.gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={styles.ctaPill}
            >
              <Text style={styles.ctaText}>Tap here to start chatting</Text>
              <View style={styles.ctaMicWrap}>
                <Icon name="mic" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  tryPremiumWrap: { borderRadius: 18, padding: 1 },
  tryPremiumInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tryPremiumText: { fontSize: 13, fontWeight: '600' },
  avatarWrap: {},
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Greeting
  greetingBlock: { marginTop: 28, gap: 8 },
  greeting: { fontSize: 30, fontWeight: '700' },
  greetingSub: { fontSize: 13, lineHeight: 19 },

  // Aurora banner
  aurora: {
    height: 110,
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1.05,
  },
  cardContent: { flex: 1, justifyContent: 'space-between', minHeight: 100 },
  cardIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtitle: { fontSize: 11, marginTop: 2 },

  // CTA
  ctaShadow: {
    marginTop: 22,
    shadowColor: '#8B00FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 22,
    paddingRight: 6,
    height: 56,
    borderRadius: 28,
  },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  ctaMicWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
});
