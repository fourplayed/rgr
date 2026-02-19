import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeMobileSupabase } from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { OfflineBanner } from '../components/common/OfflineBanner';

// Initialize Supabase client
initializeMobileSupabase();

export default function RootLayout() {
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

  // Check auth on mount - try auto-login first, then fall back to session check
  useEffect(() => {
    const initAuth = async () => {
      // Try auto-login with saved credentials first
      const autoLoginSuccess = await attemptAutoLogin();

      // If auto-login didn't succeed, check for existing session
      if (!autoLoginSuccess) {
        await checkAuth();
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth gate: redirect based on authentication status
  useEffect(() => {
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
  }, [isAuthenticated, isLoading, segments]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <View style={styles.container}>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </View>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
