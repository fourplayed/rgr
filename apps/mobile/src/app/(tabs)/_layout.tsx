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

      {/* Internal white shadow - left edge */}
      {focused && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.10)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
          }}
        />
      )}

      {/* Internal white shadow - right edge */}
      {focused && (
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
          }}
        />
      )}

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
    <View style={{ flex: 1, backgroundColor: '#E8E8E8' }}>
      <View style={{ zIndex: 999, overflow: 'visible' }}>
        <UserProfileHeader />
      </View>
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
          // Black glow surrounding the tab bar
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 9,
          elevation: 16,
          overflow: 'visible',
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        // Custom tab bar background with gradient
        tabBarBackground: () => (
          <LinearGradient
            colors={['#000099', '#0000CC', '#000099']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
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
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focused={focused} />
          ),
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
    </Tabs>
    </View>
  );
}
