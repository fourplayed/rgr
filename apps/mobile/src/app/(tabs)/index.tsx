import { Redirect } from 'expo-router';

/**
 * Redirect from root tab to assets tab
 */
export default function TabsIndex() {
  return <Redirect href="/(tabs)/assets" />;
}
