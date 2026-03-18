import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Animated, TouchableWithoutFeedback, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';

const FADE_DURATION = 200;
const STAGGER_DELAY = 80;
const MAX_ITEMS = 5;

interface ScanSuccessFlashProps {
  visible: boolean;
  assetNumber: string;
  depotName: string | null;
  photoCompleted: boolean;
  defectCompleted: boolean;
  maintenanceCompleted: boolean;
  onDismiss: () => void;
}

export function ScanSuccessFlash({
  visible,
  assetNumber,
  depotName,
  photoCompleted,
  defectCompleted,
  maintenanceCompleted,
  onDismiss,
}: ScanSuccessFlashProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  const dismissingRef = useRef(false);
  const hintLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Header animated values (checkmark icon + asset number)
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(8)).current;

  // Pre-allocate animated value sets for max possible items
  const rowAnims = useRef(
    Array.from({ length: MAX_ITEMS }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(8),
      translateX: new Animated.Value(0),
      checkScale: new Animated.Value(0),
    }))
  ).current;

  const checklistItems = useMemo(() => {
    const items: string[] = ['Scan recorded'];
    if (depotName) items.push(`Location updated to ${depotName}`);
    if (defectCompleted && photoCompleted) {
      items.push('Defect report submitted');
      items.push('Uploaded defect report photo');
    } else if (defectCompleted) {
      items.push('Defect report submitted');
    } else if (photoCompleted) {
      items.push('Uploaded asset photo');
    }
    if (maintenanceCompleted) items.push('Maintenance task created');
    return items;
  }, [depotName, photoCompleted, defectCompleted, maintenanceCompleted]);

  useEffect(() => {
    if (!visible) {
      // Stop hint loop if running
      if (hintLoopRef.current) {
        hintLoopRef.current.stop();
        hintLoopRef.current = null;
      }
      // Reset all values
      overlayOpacity.setValue(0);
      hintOpacity.setValue(0);
      checkmarkScale.setValue(0);
      headerOpacity.setValue(0);
      headerTranslateY.setValue(8);
      dismissingRef.current = false;
      rowAnims.forEach(({ opacity, translateY, translateX, checkScale }) => {
        opacity.setValue(0);
        translateY.setValue(8);
        translateX.setValue(0);
        checkScale.setValue(0);
      });
      return;
    }

    // 1. Fade in overlay
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      // 2. Fade in header (checkmark + asset number) with checkmark spring
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 3. Stagger each checklist row (fast 80ms stagger)
        const rowAnimations = checklistItems.map((_, i) => {
          const { opacity, translateY, checkScale } = rowAnims[i]!;
          return Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(30),
              Animated.spring(checkScale, {
                toValue: 1,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
              }),
            ]),
          ]);
        });

        Animated.stagger(STAGGER_DELAY, rowAnimations).start(() => {
          // 4. Show "Tap to continue" hint then start pulsing loop
          Animated.timing(hintOpacity, {
            toValue: 1,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }).start(() => {
            const loop = Animated.loop(
              Animated.sequence([
                Animated.timing(hintOpacity, {
                  toValue: 0.5,
                  duration: 750,
                  useNativeDriver: true,
                }),
                Animated.timing(hintOpacity, {
                  toValue: 0.9,
                  duration: 750,
                  useNativeDriver: true,
                }),
              ])
            );
            hintLoopRef.current = loop;
            loop.start();
          });
        });
      });
    });
  }, [
    visible,
    overlayOpacity,
    hintOpacity,
    checkmarkScale,
    headerOpacity,
    headerTranslateY,
    rowAnims,
    checklistItems,
  ]);

  const handleTap = () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;

    // Stop hint loop
    if (hintLoopRef.current) {
      hintLoopRef.current.stop();
      hintLoopRef.current = null;
    }

    // Phase 1 — Scatter rows out (alternating left/right, staggered 80ms)
    const scatterRows = Animated.stagger(
      80,
      checklistItems.map((_, i) => {
        const { opacity, translateX } = rowAnims[i]!;
        const direction = i % 2 === 0 ? -200 : 200;
        return Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: direction,
            duration: 250,
            useNativeDriver: true,
          }),
        ]);
      })
    );

    // Phase 2 — Slide header up + fade
    const slideHeader = Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Phase 3 — Fade hint
    const fadeHint = Animated.timing(hintOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    });

    // Run scatter + header + hint, then fade the green background
    Animated.parallel([scatterRows, slideHeader, fadeHint]).start(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismissRef.current();
      });
    });
  };

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <Animated.View style={[styles.overlayWrapper, { opacity: overlayOpacity }]}>
        <LinearGradient
          colors={['#22C55E', '#16A34A', '#15803D']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.overlay}
        >
          {/* Glow circle behind checkmark */}
          <View style={styles.glowCircle} pointerEvents="none" />

          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
              <Ionicons name="checkmark-circle" size={64} color="#fff" />
            </Animated.View>
            <AppText style={styles.assetNumber}>{assetNumber}</AppText>
          </Animated.View>

          <Animated.View style={styles.checklist}>
            {checklistItems.map((label, i) => {
              const { opacity, translateY, translateX, checkScale } = rowAnims[i]!;
              return (
                <Animated.View
                  key={label}
                  style={[
                    styles.checkRow,
                    { opacity, transform: [{ translateY }, { translateX }] },
                  ]}
                >
                  <View style={styles.rowAccent} />
                  <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  </Animated.View>
                  <AppText style={styles.checkText}>{label}</AppText>
                </Animated.View>
              );
            })}
          </Animated.View>

          <Animated.Text style={[styles.hint, { opacity: hintOpacity }]}>
            Tap to continue
          </Animated.Text>
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#34D399',
    opacity: 0.25,
    alignSelf: 'center',
    top: 120,
  },
  header: {
    alignItems: 'center',
  },
  assetNumber: {
    fontSize: fontSize.display,
    fontFamily: fonts.black,
    color: '#fff',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  checklist: {
    gap: 12,
    paddingHorizontal: spacing['2xl'],
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowAccent: {
    width: 2,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  checkText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: '#fff',
    flexShrink: 1,
  },
  hint: {
    position: 'absolute',
    bottom: 60,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
