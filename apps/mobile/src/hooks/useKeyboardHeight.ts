import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Returns the current keyboard height (0 when hidden).
 *
 * Uses `keyboardWillShow`/`keyboardWillHide` on iOS for smoother
 * transitions, falls back to `keyboardDidShow`/`keyboardDidHide` on Android.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
