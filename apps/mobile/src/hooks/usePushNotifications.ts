import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { upsertPushToken, withRetry } from '@rgr/shared';
import { useAuthStore } from '../store/authStore';

/**
 * Lazily load native modules that may not exist in Expo Go.
 * In dev client / production builds these will always resolve.
 */
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Device = require('expo-device');

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowInForeground: true,
    }),
  });
} catch {
  if (__DEV__) {
    console.warn('[Push] Native modules not available — push notifications disabled (Expo Go?)');
  }
}

/**
 * Hook that manages Expo push notification registration and token syncing.
 *
 * On mount (if authenticated):
 * 1. Requests notification permissions
 * 2. Gets the Expo push token
 * 3. Upserts the token to the push_tokens table
 * 4. Listens for incoming notifications
 *
 * Re-registers on app foreground transitions to ensure token freshness.
 * Gracefully no-ops in Expo Go where native modules aren't available.
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRegisteringRef = useRef(false);

  const registerForPushNotifications = useCallback(async () => {
    if (!Notifications || !Device) return;
    // Prevent concurrent registration chains from stacking on rapid foreground transitions
    if (isRegisteringRef.current) return;
    isRegisteringRef.current = true;

    // Only register on physical devices
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Skipping — not a physical device');
      isRegisteringRef.current = false;
      return;
    }

    try {
      // Set up Android notification channel (required for Android 8+)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      // Check / request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[Push] Permission not granted');
        return;
      }

      // Get the Expo push token
      const projectId =
        Constants.expoConfig?.extra?.['eas']?.['projectId'] ??
        Constants['easConfig']?.['projectId'];

      if (!projectId) {
        if (__DEV__) {
          console.warn('[Push] No EAS projectId found — set extra.eas.projectId in app.json');
        }
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      setExpoPushToken(token);

      // Upsert to database — idempotent, safe to call on every foreground.
      // Retry transient network failures (up to 3 attempts, 2s base backoff).
      if (user) {
        let deviceId: string;
        try {
          const Application = await import('expo-application');
          if (Platform.OS === 'ios') {
            deviceId = (await Application.getIosIdForVendorAsync()) || 'unknown-ios';
          } else {
            deviceId = Application.getAndroidId() || 'unknown-android';
          }
        } catch {
          // Fallback if expo-application isn't available
          deviceId = Device.modelId || Device.deviceName || 'unknown';
        }
        const os = Platform.OS;
        if (os !== 'ios' && os !== 'android') {
          if (__DEV__) console.warn('[Push] Unsupported platform:', os);
          return;
        }
        const platform = os;

        await withRetry(() => upsertPushToken({ userId: user.id, token, deviceId, platform }), {
          maxAttempts: 3,
          baseDelayMs: 2000,
          maxDelayMs: 8000,
        });
      }
    } catch (err: unknown) {
      console.error('[Push] Registration error:', err);
    } finally {
      isRegisteringRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user || !Notifications || !Device) return;

    registerForPushNotifications();

    // Re-register when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated) {
        registerForPushNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user, registerForPushNotifications]);

  // Set up notification listeners
  useEffect(() => {
    if (!Notifications) return;

    // Notification received while app is in foreground
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) console.log('[Push] Received:', notification.request.content.title);
    });

    // User tapped on a notification
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (__DEV__) console.log('[Push] Tapped:', data);
      if (data?.['assetId']) {
        router.push(`/(tabs)/assets/${data['assetId']}`);
      } else if (data?.['maintenanceId']) {
        router.push('/(tabs)/maintenance');
      } else if (data?.['defectId']) {
        router.push('/(tabs)/maintenance');
      } else if (__DEV__) {
        console.warn('[Push] Unrecognized notification payload:', data);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return { expoPushToken, permissionStatus };
}
