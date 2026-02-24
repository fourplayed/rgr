import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfileHeader } from '../../src/components/common/UserProfileHeader';

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
      width: 110,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {/* Background gradient for active state */}
    {focused && (
      <LinearGradient
        colors={[TAB_ACTIVE_BACKGROUND, '#00006B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -15,
          bottom: -25,
        }}
      />
    )}

    {/* Internal white shadow - left edge */}
    {focused && (
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.25)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: 0,
          top: -15,
          bottom: -25,
          width: 6,
        }}
      />
    )}

    {/* Internal white shadow - right edge */}
    {focused && (
      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          right: 0,
          top: -15,
          bottom: -25,
          width: 6,
        }}
      />
    )}

    <Ionicons
      name={name}
      size={30}
      color={TAB_ICON_COLOR}
      style={{
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}
    />

    {/* Subtle separator on right edge */}
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
  </View>
);

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#E8E8E8' }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ICON_COLOR,
        tabBarInactiveTintColor: TAB_ICON_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 20,
          paddingTop: 12,
          // Black glow surrounding the tab bar
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 16,
          overflow: 'hidden',
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          flex: 1,
          padding: 0,
          margin: 0,
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
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 }}>
        <UserProfileHeader />
      </View>
    </View>
  );
}
