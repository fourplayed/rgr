import { Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android (one-time setup)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
