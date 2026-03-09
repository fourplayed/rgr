import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { upsertPushToken } from '@rgr/shared';
import { useAuthStore } from '../store/authStore';

/**
 * Configure notification handler for foreground display.
 * Must be called at module level before any component renders.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowInForeground: true,
  }),
});

/**
 * Hook that manages Expo push notification registration and token syncing.
 *
 * On mount (if authenticated):
 * 1. Requests notification permissions
 * 2. Gets the Expo push token
 * 3. Upserts the token to the push_tokens table
 * 4. Listens for incoming notifications
 *
 * Re-registers on app foreground transitions.
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Set up notification listeners
  useEffect(() => {
    // Notification received while app is in foreground
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Could log to dev console if needed
        console.log('[Push] Received:', notification.request.content.title);
      }
    );

    // User tapped on a notification
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.['assetId']) {
          // Navigation to asset detail could be handled here via router
          console.log('[Push] Tapped, navigate to asset:', data['assetId']);
        }
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  async function registerForPushNotifications() {
    // Only register on physical devices
    if (!Device.isDevice) {
      console.log('[Push] Skipping — not a physical device');
      return;
    }

    try {
      // Check / request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted');
        return;
      }

      // Get the Expo push token
      const projectId =
        Constants.expoConfig?.extra?.['eas']?.['projectId'] ??
        Constants['easConfig']?.['projectId'];

      if (!projectId) {
        console.warn(
          '[Push] No EAS projectId found — set extra.eas.projectId in app.json'
        );
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      setExpoPushToken(token);

      // Upsert to database
      if (user && !registeredRef.current) {
        const deviceId = Device.modelId || Device.deviceName || 'unknown';
        const platform = Platform.OS as 'ios' | 'android';

        await upsertPushToken({
          userId: user.id,
          token,
          deviceId,
          platform,
        });

        registeredRef.current = true;
      }
    } catch (err) {
      console.error('[Push] Registration error:', err);
    }
  }

  return { expoPushToken, permissionStatus };
}
