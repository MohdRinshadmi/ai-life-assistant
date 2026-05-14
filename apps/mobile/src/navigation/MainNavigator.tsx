import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ChatScreen } from '../features/chat/screens/ChatScreen';
import { TasksScreen } from '../features/tasks/screens/TasksScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { NotesScreen } from '../features/knowledge/screens/NotesScreen';

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Notes: undefined;
  Tasks: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'AI Chat' }} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ tabBarLabel: 'Notes' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Tasks' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
