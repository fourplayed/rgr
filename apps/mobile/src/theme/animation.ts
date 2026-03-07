/**
 * Shared animation constants for sheet modals and bottom sheets.
 * Keeps BottomSheet and SheetModal synchronized.
 */

export const SHEET_SPRING = { friction: 9, tension: 65, useNativeDriver: true } as const;
export const SHEET_EXIT = { duration: 200, useNativeDriver: true } as const;
export const BACKDROP_IN = { duration: 250, useNativeDriver: true } as const;
export const BACKDROP_OUT = { duration: 200, useNativeDriver: true } as const;
