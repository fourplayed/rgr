jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockAsyncStorage = require('@react-native-async-storage/async-storage').default;
import { useSettingsStore } from '../settingsStore';

const defaultNotifications = {
  pushEnabled: true,
  emailEnabled: true,
  maintenanceAlerts: true,
  scanConfirmations: true,
};

describe('useSettingsStore', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    useSettingsStore.setState({ notifications: { ...defaultNotifications } });
  });

  it('defaults are all true', () => {
    const { notifications } = useSettingsStore.getState();
    expect(notifications.pushEnabled).toBe(true);
    expect(notifications.emailEnabled).toBe(true);
    expect(notifications.maintenanceAlerts).toBe(true);
    expect(notifications.scanConfirmations).toBe(true);
  });

  it('setNotificationSetting updates one key', () => {
    useSettingsStore.getState().setNotificationSetting('pushEnabled', false);
    expect(useSettingsStore.getState().notifications.pushEnabled).toBe(false);
  });

  it('other settings are preserved after single change', () => {
    useSettingsStore.getState().setNotificationSetting('pushEnabled', false);
    const { notifications } = useSettingsStore.getState();
    expect(notifications.emailEnabled).toBe(true);
    expect(notifications.maintenanceAlerts).toBe(true);
    expect(notifications.scanConfirmations).toBe(true);
  });

  it('multiple changes accumulate', () => {
    useSettingsStore.getState().setNotificationSetting('pushEnabled', false);
    useSettingsStore.getState().setNotificationSetting('emailEnabled', false);
    const { notifications } = useSettingsStore.getState();
    expect(notifications.pushEnabled).toBe(false);
    expect(notifications.emailEnabled).toBe(false);
    expect(notifications.maintenanceAlerts).toBe(true);
    expect(notifications.scanConfirmations).toBe(true);
  });

  it('resetNotifications restores defaults', () => {
    useSettingsStore.getState().setNotificationSetting('pushEnabled', false);
    useSettingsStore.getState().setNotificationSetting('emailEnabled', false);
    useSettingsStore.getState().resetNotifications();
    const { notifications } = useSettingsStore.getState();
    expect(notifications.pushEnabled).toBe(true);
    expect(notifications.emailEnabled).toBe(true);
  });

  it('set then reset round-trips correctly', () => {
    useSettingsStore.getState().setNotificationSetting('scanConfirmations', false);
    expect(useSettingsStore.getState().notifications.scanConfirmations).toBe(false);
    useSettingsStore.getState().resetNotifications();
    expect(useSettingsStore.getState().notifications.scanConfirmations).toBe(true);
  });

  it('persistence: set value then verify AsyncStorage has data', async () => {
    useSettingsStore.getState().setNotificationSetting('pushEnabled', false);
    // Allow persistence middleware to flush
    await new Promise((r) => setTimeout(r, 50));
    const stored = await mockAsyncStorage.getItem('rgr-settings');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.notifications.pushEnabled).toBe(false);
  });
});
