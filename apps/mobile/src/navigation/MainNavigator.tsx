import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@hooks/useTheme';
import { ChatScreen } from '@features/chat/screens/ChatScreen';
import { TasksScreen } from '@features/tasks/screens/TasksScreen';
import { SettingsScreen } from '@features/settings/screens/SettingsScreen';
import { HomeScreen } from '@features/home/screens/HomeScreen';
import { NotesScreen } from '@features/knowledge/screens/NotesScreen';

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Notes: undefined;
  Tasks: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Notes: { active: 'document-text', inactive: 'document-text-outline' },
  Tasks: { active: 'checkbox', inactive: 'checkbox-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

/**
 * Icon renderers are created once at module scope (not inside the navigator's
 * render) so React sees a stable component identity across re-renders —
 * avoids react/no-unstable-nested-components and needless subtree remounts.
 */
function makeTabIcon(routeName: keyof MainTabParamList) {
  const icons = TAB_ICONS[routeName];
  return function TabBarIcon({ focused, color, size }: TabBarIconProps) {
    return <Icon name={focused ? icons.active : icons.inactive} size={size ?? 22} color={color} />;
  };
}

const TAB_ICON_RENDERERS: Record<
  keyof MainTabParamList,
  (props: TabBarIconProps) => React.JSX.Element
> = {
  Home: makeTabIcon('Home'),
  Chat: makeTabIcon('Chat'),
  Notes: makeTabIcon('Notes'),
  Tasks: makeTabIcon('Tasks'),
  Settings: makeTabIcon('Settings'),
};

export function MainNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: TAB_ICON_RENDERERS[route.name],
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: theme.layout.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'AI Chat' }} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ tabBarLabel: 'Notes' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Tasks' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
