import React, { useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function AssetsLayout() {
  const router = useRouter();
  const segments = useSegments();

  // Reset to index when the assets tab is focused and we're on a detail page
  useFocusEffect(
    useCallback(() => {
      // Check if we're on a nested asset detail screen (e.g., assets/[id])
      const isOnDetailPage = segments.length > 2 && segments[1] === 'assets' && segments[2] !== undefined;

      if (isOnDetailPage) {
        // Use setTimeout to avoid navigation during render
        const timer = setTimeout(() => {
          router.replace('/(tabs)/assets');
        }, 0);
        return () => clearTimeout(timer);
      }
    }, [segments, router])
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
