import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LoadingDots } from '../components/common/LoadingDots';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Lato_100Thin,
  Lato_100Thin_Italic,
  Lato_300Light,
  Lato_300Light_Italic,
  Lato_400Regular,
  Lato_400Regular_Italic,
  Lato_700Bold,
  Lato_700Bold_Italic,
  Lato_900Black,
  Lato_900Black_Italic,
} from '@expo-google-fonts/lato';
import { initializeMobileSupabase } from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { OfflineBanner } from '../components/common/OfflineBanner';

// Set default text style
const defaultTextStyle = { fontFamily: 'Lato_400Regular' };
// @ts-expect-error - Override default text style (defaultProps is deprecated but still works)
Text.defaultProps = Text.defaultProps || {};
// @ts-expect-error - Setting default style on Text component
Text.defaultProps.style = defaultTextStyle;

// Initialize Supabase client
initializeMobileSupabase();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lato_100Thin,
    Lato_100Thin_Italic,
    Lato_300Light,
    Lato_300Light_Italic,
    Lato_400Regular,
    Lato_400Regular_Italic,
    Lato_700Bold,
    Lato_700Bold_Italic,
    Lato_900Black,
    Lato_900Black_Italic,
  });

  // Create React Query client inside component to prevent HMR issues
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      })
  );

  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, checkAuth, attemptAutoLogin } = useAuthStore();
  const { resolveDepot } = useLocationStore();

  // Check auth on mount - try auto-login first, then fall back to session check
  useEffect(() => {
    const initAuth = async () => {
      // Try auto-login with saved credentials first
      const autoLoginSuccess = await attemptAutoLogin();

      if (autoLoginSuccess) {
        // Fire and forget: resolve depot based on GPS location
        resolveDepot();
      } else {
        // If auto-login didn't succeed, check for existing session
        await checkAuth();
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if navigation state is ready
  const navigationState = useRootNavigationState();

  // Auth gate: redirect based on authentication status
  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;
    if (isLoading) return; // Wait for auth check to finish

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and trying to access protected routes
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated and on auth screens
      router.replace('/(tabs)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, segments, navigationState?.key]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color="#0000FF" size={12} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
        </View>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
