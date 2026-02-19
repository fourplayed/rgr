import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontSize } from '../../theme/spacing';

const TAB_BAR_BACKGROUND = '#0000CC';
const TAB_ACTIVE_COLOR = '#FFFFFF';
const TAB_INACTIVE_COLOR = '#D1D5DB';
const SEPARATOR_COLOR = 'rgba(255, 255, 255, 0.2)';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IoniconsName;
  color: string;
  size: number;
  isFirst?: boolean;
}

function TabIcon({ name, color, size, isFirst }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, !isFirst && styles.iconWithSeparator]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 10,
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
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="qr-code-outline" color={color} size={size} isFirst />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cube-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Maintenance',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="construct-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="time-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 8,
  },
  iconWithSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: SEPARATOR_COLOR,
  },
});
