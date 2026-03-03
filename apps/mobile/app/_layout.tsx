import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, StyleSheet, Text } from 'react-native';
import { LoadingDots } from '../src/components/common/LoadingDots';
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
import { onAuthStateChange, getSupabaseClient } from '@rgr/shared';
import { initializeMobileSupabase } from '../src/config/supabase';
import { useAuthStore } from '../src/store/authStore';
import { useLocationStore } from '../src/store/locationStore';
import { UserPermissionsProvider } from '../src/contexts/UserPermissionsContext';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { colors } from '../src/theme/colors';

// Set default text style globally
// DEPRECATION WARNING: Text.defaultProps is deprecated in React 18.3+ and will break in React 19.
// Migration path: Use <AppText> from 'src/components/common/AppText' for new components.
// This fallback remains for existing code compatibility during gradual migration.
// See: https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-proptypes-and-defaultprops
const defaultTextStyle = { fontFamily: 'Lato_400Regular' };
// @ts-expect-error - defaultProps is deprecated but functional in RN; temporary fallback
Text.defaultProps = Text.defaultProps || {};
// @ts-expect-error - Setting default font family on all Text components
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
            gcTime: 1000 * 60 * 10, // Keep inactive queries in cache for 10 min
            retry: 1,
            refetchOnWindowFocus: false, // Critical for mobile - prevents refetch on app resume
            refetchOnReconnect: 'always', // Refetch when network reconnects
          },
        },
      })
  );

  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated, isLoading, checkAuth, attemptAutoLogin } = useAuthStore();
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
    // Intentionally run only on mount - attemptAutoLogin, checkAuth, and resolveDepot
    // are stable store functions that should not trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for auth state changes (e.g. token refresh failure, session revocation)
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        const { isAuthenticated, handleSessionExpired } = useAuthStore.getState();
        if (isAuthenticated) {
          handleSessionExpired();
        }
      }
    });
    return unsubscribe;
  }, []);

  // Proactively refresh auth session when app returns to foreground.
  // iOS suspends the JS thread when backgrounded, which stops Supabase JS's
  // autoRefreshToken timer. This ensures the token is refreshed before any
  // data queries fire on resume.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          getSupabaseClient().auth.getSession();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Clear React Query cache when user logs out to prevent stale data on next login
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      queryClient.clear();
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);

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
    // router.replace is stable and should not be in deps to avoid navigation loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, segments, navigationState?.key]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color={colors.electricBlue} size={12} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserPermissionsProvider userRole={user?.role ?? null}>
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
              <Stack.Screen
                name="audit-log"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="(admin)"
                options={{
                  presentation: 'card',
                }}
              />
            </Stack>
          </View>
        </UserPermissionsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.chrome,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
