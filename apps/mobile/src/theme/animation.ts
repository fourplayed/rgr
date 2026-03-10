/**
 * Shared animation constants for sheet modals and bottom sheets.
 * Keeps BottomSheet and SheetModal synchronized.
 */

export const SHEET_SPRING = { friction: 9, tension: 65, useNativeDriver: true } as const;
export const SHEET_EXIT = { duration: 200, useNativeDriver: true } as const;
export const BACKDROP_IN = { duration: 250, useNativeDriver: true } as const;
export const SCATTER_EXIT = { staggerDelay: 60, duration: 250, distance: 200 } as const;

/** Centered card scale-in (punchier than sheet slide) */
export const CARD_SPRING = { friction: 8, tension: 65, useNativeDriver: true } as const;

/** Tab content cross-fade (fast, subtle) */
export const TAB_FADE = { duration: 150, useNativeDriver: true } as const;

/** Full-screen modal slide (stiffer/faster than bottom sheet) */
export const FULLSCREEN_SPRING = { friction: 10, tension: 70, useNativeDriver: true } as const;

/** gorhom/bottom-sheet spring config (damping/stiffness, not friction/tension) */
export const GORHOM_SPRING = { damping: 18, stiffness: 65 } as const;
