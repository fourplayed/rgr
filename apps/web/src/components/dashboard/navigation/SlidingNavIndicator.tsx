/**
 * SlidingNavIndicator - Animated indicator that tracks hover state on navigation buttons
 *
 * Features:
 * - Shows on active page by default
 * - Smooth sliding animation between nav items on hover
 * - Returns to active page indicator when hover ends
 * - Automatic position and width calculation
 * - Theme-aware styling with RGR color palette
 * - Performance optimized with RAF and debouncing
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface SlidingNavIndicatorProps {
  /**
   * Whether dark theme is active
   */
  isDark: boolean;

  /**
   * Custom className for additional styling
   */
  className?: string;

  /**
   * Z-index for the indicator (default: 10)
   */
  zIndex?: number;
}

interface IndicatorState {
  left: number;
  width: number;
  opacity: number;
}

/**
 * SlidingNavIndicator Component
 *
 * Renders an animated underline/bar that slides beneath hovered navigation items.
 * Uses getBoundingClientRect for precise positioning and CSS transitions for smooth animations.
 *
 * Architecture:
 * - State: Tracks left position, width, and opacity
 * - Refs: Uses RAF for smooth updates and timeout for fade delay
 * - Events: Listens to mouseover/mouseleave on nav buttons
 */
export const SlidingNavIndicator = React.memo<SlidingNavIndicatorProps>(({
  isDark: _isDark,
  className = '',
  zIndex = 10,
}) => {
  const location = useLocation();

  // State for indicator position and visibility
  const [indicatorState, setIndicatorState] = useState<IndicatorState>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  // Refs for cleanup and animation control
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const activeButtonRef = useRef<HTMLElement | null>(null);

  /**
   * Update indicator position based on hovered element
   * Uses requestAnimationFrame for smooth updates
   */
  const updateIndicatorPosition = useCallback((element: HTMLElement) => {
    // Cancel any pending fade-out
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Use RAF for smooth position updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const navContainer = containerRef.current;
      if (!navContainer) return;

      const elementRect = element.getBoundingClientRect();
      const containerRect = navContainer.getBoundingClientRect();

      // Find icon and text elements within the button
      const icon = element.querySelector('svg');
      const text = element.querySelector('span');

      if (icon && text) {
        const iconRect = icon.getBoundingClientRect();
        const textRect = text.getBoundingClientRect();

        // Start from icon left edge
        const startLeft = iconRect.left;

        // End at text right edge
        const endRight = textRect.right;

        // Calculate full width from icon to end of text, plus 10px extra
        const fullWidth = endRight - startLeft + 10;

        // Position starting from icon left, shifted 25px left
        const left = startLeft - containerRect.left - 25;

        setIndicatorState({
          left,
          width: fullWidth,
          opacity: 1,
        });
      } else {
        // Fallback to button center if elements not found
        const buttonCenter = elementRect.left + (elementRect.width / 2);
        const lineWidth = 50;
        const left = buttonCenter - containerRect.left - (lineWidth / 2) - 25;

        setIndicatorState({
          left,
          width: lineWidth,
          opacity: 1,
        });
      }
    });
  }, []);

  /**
   * Return indicator to active button when hover ends
   */
  const returnToActiveButton = useCallback(() => {
    // Clear any existing timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // Return to active button if one exists
    if (activeButtonRef.current) {
      updateIndicatorPosition(activeButtonRef.current);
    } else {
      // No active button, hide indicator
      setIndicatorState((prev) => ({
        ...prev,
        opacity: 0,
      }));
    }
  }, [updateIndicatorPosition]);

  /**
   * Handle mouse enter on nav button
   */
  const handleNavButtonHover = useCallback((event: Event) => {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      updateIndicatorPosition(target);
    }
  }, [updateIndicatorPosition]);

  /**
   * Handle mouse leave from nav container - return to active button
   */
  const handleNavLeave = useCallback(() => {
    returnToActiveButton();
  }, [returnToActiveButton]);

  /**
   * Setup event listeners on mount
   */
  useEffect(() => {
    // Find the nav container (parent of nav buttons)
    const navElement = document.querySelector('[aria-label="Main navigation"]');
    if (!navElement) return;

    containerRef.current = navElement as HTMLElement;

    // Find only the main nav buttons (not theme/settings/logout)
    const navButtons = navElement.querySelectorAll('button[data-nav-button="true"]');

    // Attach hover listeners to each nav button
    navButtons.forEach((button) => {
      button.addEventListener('mouseenter', handleNavButtonHover);
    });

    // Attach mouseleave to the nav container
    navElement.addEventListener('mouseleave', handleNavLeave);

    // Cleanup on unmount
    return () => {
      navButtons.forEach((button) => {
        button.removeEventListener('mouseenter', handleNavButtonHover);
      });

      navElement.removeEventListener('mouseleave', handleNavLeave);

      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleNavButtonHover, handleNavLeave]);

  /**
   * Find and show indicator on active page button
   */
  useEffect(() => {
    // Small delay to ensure DOM is ready after navigation
    const timeoutId = setTimeout(() => {
      const navElement = document.querySelector('[aria-label="Main navigation"]');
      if (!navElement) return;

      // Find the active button (has aria-current="page")
      const activeButton = navElement.querySelector('button[aria-current="page"]') as HTMLElement | null;

      if (activeButton) {
        activeButtonRef.current = activeButton;
        updateIndicatorPosition(activeButton);
      } else {
        activeButtonRef.current = null;
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, updateIndicatorPosition]);

  // Theme-aware colors - Cyan for dark, deep blue for light (matching nav button hover color)
  const indicatorColor = _isDark ? '#06b6d4' : '#1e40af'; // Cyan-500 for dark, blue-800 for light

  return (
    <div
      className={`pointer-events-none absolute bottom-0 h-0.5 ease-out ${className}`}
      style={{
        left: `${indicatorState.left}px`,
        width: `${indicatorState.width}px`,
        opacity: indicatorState.opacity,
        backgroundColor: indicatorColor,
        boxShadow: 'none',
        zIndex,
        transform: 'translateZ(0)', // Force GPU acceleration
        transformOrigin: 'left', // Grow from left to right
        willChange: 'left, width, opacity', // Optimize animations
        transition: 'left 0.25s ease-out, width 0.3s ease-out, opacity 0.15s ease-out, background-color 0.15s ease-out, box-shadow 0.15s ease-out',
      }}
      aria-hidden="true"
    />
  );
});

SlidingNavIndicator.displayName = 'SlidingNavIndicator';

export default SlidingNavIndicator;
