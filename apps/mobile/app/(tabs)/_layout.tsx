import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { UserProfileHeader } from '../../src/components/common/UserProfileHeader';
import { colors } from '../../src/theme/colors';

const TAB_BAR_BACKGROUND = colors.brandTabBar;
const TAB_ACTIVE_BACKGROUND = colors.brandTabActive;
const TAB_ICON_COLOR = colors.textInverse;

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  scan: 'qr-code-outline',
  assets: 'cube-outline',
  maintenance: 'construct-outline',
};

// ── Animated tab bar with sliding active indicator ──────────────
function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  const isInitial = useRef(true);

  // Only show routes that have a defined icon (filters out the index redirect)
  const visibleRoutes = state.routes.filter((route) => route.name in TAB_ICONS);

  const tabCount = visibleRoutes.length;
  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;

  // Map navigation state index → visual index among visible tabs
  const activeRouteKey = state.routes[state.index]?.key;
  const activeVisualIndex = Math.max(
    0,
    visibleRoutes.findIndex((r) => r.key === activeRouteKey),
  );

  useEffect(() => {
    if (tabWidth === 0) return;
    const toValue = activeVisualIndex * tabWidth;

    if (isInitial.current) {
      // Set position instantly on first layout (no visible spring-in)
      translateX.setValue(toValue);
      isInitial.current = false;
    } else {
      Animated.spring(translateX, {
        toValue,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [activeVisualIndex, tabWidth, translateX]);

  return (
    <View
      style={{
        height: 70,
        paddingBottom: 20,
        backgroundColor: TAB_BAR_BACKGROUND,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 16,
      }}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {/* Full-bar gradient background */}
      <LinearGradient
        colors={[...colors.brandGradient]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Sliding active indicator (spring-animated, like SegmentedTabs) */}
      {tabWidth > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: tabWidth,
            transform: [{ translateX }],
          }}
        >
          <LinearGradient
            colors={[TAB_ACTIVE_BACKGROUND, colors.navy]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          {/* Left edge highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.25)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 }}
          />
          {/* Right edge highlight */}
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.25)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6 }}
          />
        </Animated.View>
      )}

      {/* Tab buttons */}
      <View style={{ flex: 1, flexDirection: 'row', paddingTop: 4 }}>
        {visibleRoutes.map((route, index) => {
          const isFocused = activeVisualIndex === index;
          const icon = TAB_ICONS[route.name] ?? 'help-outline';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={route.name}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons
                name={icon}
                size={28}
                color={TAB_ICON_COLOR}
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.3)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              />
              {/* Subtle separator between tabs */}
              {index < tabCount - 1 && (
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
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.chrome }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AnimatedTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{ href: null }}
        />
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
        <Tabs.Screen name="assets" options={{ title: 'Assets' }} />
        <Tabs.Screen name="maintenance" options={{ title: 'Maintenance' }} />
      </Tabs>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 }}>
        <UserProfileHeader />
      </View>
    </View>
  );
}
