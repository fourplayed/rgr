import { Redirect } from 'expo-router';

/**
 * Redirect from root tab to home tab
 */
export default function TabsIndex() {
  return <Redirect href="/(tabs)/home" />;
}
