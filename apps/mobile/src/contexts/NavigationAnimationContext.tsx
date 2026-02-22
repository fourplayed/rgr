import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';
import { Animated } from 'react-native';

interface NavigationAnimationContextType {
  headerTranslateY: Animated.Value;
  footerTranslateY: Animated.Value;
  hideHeaderAndFooter: () => void;
  showHeaderAndFooter: () => void;
  animateIn: () => void;
  isInitialMount: boolean;
  setInitialMountComplete: () => void;
}

const NavigationAnimationContext = createContext<NavigationAnimationContextType | null>(null);

const HEADER_HEIGHT = 80;
const FOOTER_HEIGHT = 70;
const ANIMATION_DURATION = 250;

export function NavigationAnimationProvider({ children }: { children: React.ReactNode }) {
  const headerTranslateY = useRef(new Animated.Value(-HEADER_HEIGHT)).current;
  const footerTranslateY = useRef(new Animated.Value(FOOTER_HEIGHT)).current;
  const [isInitialMount, setIsInitialMount] = useState(true);

  const hideHeaderAndFooter = useCallback(() => {
    Animated.parallel([
      Animated.timing(headerTranslateY, {
        toValue: -HEADER_HEIGHT,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(footerTranslateY, {
        toValue: FOOTER_HEIGHT,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerTranslateY, footerTranslateY]);

  const showHeaderAndFooter = useCallback(() => {
    Animated.parallel([
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(footerTranslateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerTranslateY, footerTranslateY]);

  const animateIn = useCallback(() => {
    headerTranslateY.setValue(-HEADER_HEIGHT);
    footerTranslateY.setValue(FOOTER_HEIGHT);

    Animated.parallel([
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(footerTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerTranslateY, footerTranslateY]);

  const setInitialMountComplete = useCallback(() => {
    setIsInitialMount(false);
  }, []);

  return (
    <NavigationAnimationContext.Provider
      value={{
        headerTranslateY,
        footerTranslateY,
        hideHeaderAndFooter,
        showHeaderAndFooter,
        animateIn,
        isInitialMount,
        setInitialMountComplete,
      }}
    >
      {children}
    </NavigationAnimationContext.Provider>
  );
}

export function useNavigationAnimation() {
  const context = useContext(NavigationAnimationContext);
  if (!context) {
    throw new Error('useNavigationAnimation must be used within NavigationAnimationProvider');
  }
  return context;
}
