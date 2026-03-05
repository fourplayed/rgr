import { useRef, useState, useEffect } from 'react';
import { Animated, useWindowDimensions } from 'react-native';

const ANIMATION_DURATION = 300;

interface AnimatedSheetReturn {
  modalVisible: boolean;
  backdropStyle: { opacity: Animated.Value };
  sheetStyle: { transform: [{ translateY: Animated.Value }] };
}

/**
 * Encapsulates the open/close animation pattern shared by bottom-sheet modals.
 * Returns `modalVisible` (controls RN Modal), plus spread-ready style objects
 * for the backdrop and sheet `Animated.View`s.
 */
export function useAnimatedSheet(visible: boolean): AnimatedSheetReturn {
  const { height: screenHeight } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const animGenRef = useRef(0);

  useEffect(() => {
    const gen = ++animGenRef.current;
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: screenHeight,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (animGenRef.current === gen) setModalVisible(false);
      });
    }
  }, [visible, backdropOpacity, sheetTranslateY, screenHeight]);

  return {
    modalVisible,
    backdropStyle: { opacity: backdropOpacity },
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
  };
}
