import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  maintenanceAlerts: boolean;
  scanConfirmations: boolean;
}

interface SettingsState {
  notifications: NotificationSettings;
  setNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  resetNotifications: () => void;
}

const defaultNotifications: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: true,
  maintenanceAlerts: true,
  scanConfirmations: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: defaultNotifications,

      setNotificationSetting: (key, value) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: value,
          },
        })),

      resetNotifications: () =>
        set({ notifications: defaultNotifications }),
    }),
    {
      name: 'rgr-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
