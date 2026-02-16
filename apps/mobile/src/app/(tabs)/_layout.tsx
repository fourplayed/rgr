import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../theme/colors';
import { fontSize } from '../../theme/spacing';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.electricBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopColor: colors.borderDark,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar (redirect only)
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color }) => (
            <TabIconPlaceholder color={color} name="assets" />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <TabIconPlaceholder color={color} name="scan" />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => (
            <TabIconPlaceholder color={color} name="activity" />
          ),
        }}
      />
    </Tabs>
  );
}

// Placeholder icon component (replace with actual icons later)
function TabIconPlaceholder({ color, name }: { color: string; name: string }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        backgroundColor: color,
        borderRadius: 4,
      }}
    />
  );
}
