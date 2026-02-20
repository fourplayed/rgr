import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfileHeader } from '../../components/common/UserProfileHeader';

const TAB_BAR_BACKGROUND = '#0000CC';
const TAB_ACTIVE_BACKGROUND = '#000099';
const TAB_ICON_COLOR = '#FFFFFF';

// Custom tab icon with enhanced visual depth
const TabIcon = ({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) => (
  <View
    style={{
      width: '100%',
      height: '100%',
      position: 'relative',
    }}
  >
    {/* Main container with gradient and borders */}
    <LinearGradient
      colors={
        focused
          ? [TAB_ACTIVE_BACKGROUND, '#00006B'] // Darker gradient for active
          : ['transparent', 'transparent']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons
        name={name}
        size={28}
        color={TAB_ICON_COLOR}
        style={{
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
      />

      {/* Subtle separator on right edge (except last tab) */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: '20%',
          bottom: '20%',
          width: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }}
      />
    </LinearGradient>
  </View>
);

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <UserProfileHeader />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ICON_COLOR,
        tabBarInactiveTintColor: TAB_ICON_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          // Enhanced shadow for more depth
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 16,
          // Add subtle gradient effect via overlay (handled by LinearGradient in background)
          overflow: 'hidden',
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        // Custom tab bar background with gradient
        tabBarBackground: () => (
          <LinearGradient
            colors={['#0000CC', '#0000AA']} // Subtle gradient from top to bottom
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          >
            {/* Inner shadow effect at top */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
              }}
            />
          </LinearGradient>
        ),
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
          tabBarIcon: ({ focused }) => (
            <TabIcon name="qr-code-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="cube-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Maintenance',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="construct-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="time-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
