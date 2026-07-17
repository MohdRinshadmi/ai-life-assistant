import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@stores/authStore';
import { GlassCard, MicOrb, ScreenContainer } from '@components/ui';
import { spacing } from '@theme';
import type { MainTabParamList } from '@navigation/MainNavigator';
import type { RootStackParamList } from '@navigation/RootNavigator';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ACTIONS: { key: string; title: string; subtitle: string; icon: string }[] = [
  { key: 'chat',  title: 'Start a Chat',   subtitle: 'Ask anything',   icon: 'chatbubble-ellipses' },
  { key: 'note',  title: 'Capture a Note', subtitle: 'Save to memory', icon: 'document-text' },
  { key: 'task',  title: 'Create a Task',  subtitle: 'Plan your day',  icon: 'checkbox' },
  { key: 'voice', title: 'Voice Command',  subtitle: 'Hands-free',     icon: 'mic' },
];

const ROUTE_FOR: Record<string, keyof MainTabParamList> = {
  chat: 'Chat',
  note: 'Notes',
  task: 'Tasks',
  voice: 'Chat',
};

const GRADIENT_H_START = { x: 0, y: 0.5 };
const GRADIENT_H_END = { x: 1, y: 0.5 };
const GRADIENT_D_START = { x: 0, y: 0 };
const GRADIENT_D_END = { x: 1, y: 1 };

function daypart(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Concentric ring that slowly breathes around the voice stage. */
function BreathingRing({ size, delay, opacity }: { size: number; delay: number; opacity: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInUp.delay(delay)}
      pointerEvents="none"
      style={[
        styles.ring,
        animated,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderColor: `rgba(139,0,255,${opacity})`,
        },
      ]}
    />
  );
}

export function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<HomeNavProp>();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.displayName ?? 'there').split(' ')[0];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <Animated.View entering={FadeInUp} style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Try Premium">
            <LinearGradient
              colors={theme.colors.gradients.primarySoft}
              start={GRADIENT_H_START} end={GRADIENT_H_END}
              style={styles.tryPremiumWrap}
            >
              <View style={[styles.tryPremiumInner, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.tryPremiumText, { color: theme.colors.heading }]}>Try Premium</Text>
                <Icon name="add" size={14} color={theme.colors.heading} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={theme.colors.gradients.primary}
                start={GRADIENT_D_START} end={GRADIENT_D_END}
                style={[styles.avatar, styles.avatarFallback]}
              >
                <Text style={styles.avatarInitial}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
        </Animated.View>

        {/* Hero */}
        <Animated.View entering={FadeInUp.delay(80)} style={styles.hero}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.eyebrowDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={[styles.eyebrow, { color: theme.colors.subtle }]}>
              {daypart().toUpperCase()}
            </Text>
          </View>
          <Text style={[theme.textStyles.display, styles.greeting, { color: theme.colors.heading }]}>
            Hi {firstName},{'\n'}
            <Text style={{ color: theme.colors.accentLight }}>what can I do for you?</Text>
          </Text>
          <Text style={[styles.greetingSub, { color: theme.colors.subtle }]}>
            Give any command naturally, from{'\n'}generating notes to scheduling tasks
          </Text>
        </Animated.View>

        {/* Voice stage — the signature centerpiece */}
        <Animated.View entering={FadeInUp.delay(160)} style={styles.stage}>
          <BreathingRing size={220} delay={200} opacity={0.25} />
          <BreathingRing size={300} delay={320} opacity={0.12} />
          <MicOrb size={128} onPress={() => navigation.navigate('Chat')} />
          <Text style={[styles.stageCaption, { color: theme.colors.subtle }]}>
            Tap and just speak
          </Text>
        </Animated.View>

        {/* Action tiles */}
        <Animated.View entering={FadeInUp.delay(240)} style={styles.tiles}>
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.key}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(ROUTE_FOR[a.key])}
              accessibilityRole="button"
              accessibilityLabel={`${a.title} — ${a.subtitle}`}
            >
              <GlassCard borderRadius={18}>
                <View style={styles.tileRow}>
                  <View style={styles.tileIconWrap}>
                    <Icon name={a.icon} size={17} color={theme.colors.accent} />
                  </View>
                  <View style={styles.tileTextBlock}>
                    <Text style={[styles.tileTitle, { color: theme.colors.heading }]}>{a.title}</Text>
                    <Text style={[styles.tileSubtitle, { color: theme.colors.subtle }]}>{a.subtitle}</Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={theme.colors.muted} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  tryPremiumWrap: { borderRadius: 18, padding: 1 },
  tryPremiumInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  tryPremiumText: { fontSize: 13, fontWeight: '600' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Hero
  hero: { marginTop: spacing.xl, alignItems: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4 },
  greeting: { textAlign: 'center', marginTop: spacing.md },
  greetingSub: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.md },

  // Voice stage
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    marginVertical: spacing.md,
  },
  ring: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    borderWidth: 1,
  },
  stageCaption: {
    marginTop: spacing.xl,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // Action tiles
  tiles: { gap: spacing.md },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tileIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(139,0,255,0.16)',
  },
  tileTextBlock: { flex: 1 },
  tileTitle: { fontSize: 14, fontWeight: '600' },
  tileSubtitle: { fontSize: 11, marginTop: spacing['2xs'] },
});
