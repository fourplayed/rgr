/**
 * Stars - Animated starfield background for both dark and light modes
 * Generates random star positions using box-shadow with theme-aware colors
 */
import { useMemo, memo } from 'react';
import { DEFAULT_SETTINGS, DARK_THEME_SETTINGS, type ThemeSettings } from './themeSettings';
import { ExplodingStars } from './ExplodingStars';

interface StarConfig {
  color: string;
  size: number;
  glowRadius: number;
  glowColor: string;
}

/**
 * Generate stars with glow effect - subtle glow
 * Stars spawn off-screen to the right and travel left across viewport
 */
function generateStarsWithGlow(count: number, config: StarConfig): string {
  const stars: string[] = [];
  const travelDistance = 150; // Stars spawn across 150vw travel distance
  const viewportHeight = 1200; // Vertical distribution

  for (let i = 0; i < count; i++) {
    // Random x position across the travel distance (in vw units converted to approximate px)
    const x = Math.floor(Math.random() * (travelDistance * 19.2)); // ~150vw in px (assuming 1920px viewport)
    // Random y position within viewport height
    const y = Math.floor(Math.random() * viewportHeight);

    // Dual-layer shadow: glow + core
    stars.push(
      `${x}px ${y}px ${config.glowRadius}px ${config.glowColor}, ` +
      `${x}px ${y}px ${config.size}px ${config.color}`
    );
  }
  return stars.join(', ');
}

/**
 * Generate star positions (position and size data only, no color)
 * Returns array of {x, y, size, withGlow} objects
 * Extended horizontal spread (260vw) for seamless continuous flow
 */
function generateStarPositions(count: number, size: number, withGlow: boolean = false, yMinPercent: number = 0, yMaxPercent: number = 100): Array<{x: number, y: number, size: number, withGlow: boolean}> {
  const positions: Array<{x: number, y: number, size: number, withGlow: boolean}> = [];
  const travelDistance = 260; // Extended from 150 to 260 to match CSS animation range
  const viewportHeight = 1200;

  // Calculate vertical bounds based on percentages
  const minY = Math.floor(viewportHeight * (yMinPercent / 100));
  const maxY = Math.floor(viewportHeight * (yMaxPercent / 100));
  const heightRange = maxY - minY;

  for (let i = 0; i < count; i++) {
    // Spread stars across full 260vw travel distance for seamless flow
    const x = Math.floor(Math.random() * (travelDistance * 19.2));
    const y = Math.floor(minY + Math.random() * heightRange);
    positions.push({ x, y, size, withGlow });
  }
  return positions;
}

/**
 * Convert star positions to box-shadow string with color applied
 */
function positionsToBoxShadow(positions: Array<{x: number, y: number, size: number, withGlow: boolean}>, color: string, glowColor?: string): string {
  const stars: string[] = [];
  for (const pos of positions) {
    if (pos.withGlow) {
      // Soft centered glow behind the star core
      const gc = glowColor ?? color;
      stars.push(
        `${pos.x}px ${pos.y}px ${pos.size * 18}px ${pos.size * 4.5}px ${gc}, ` +
        `${pos.x}px ${pos.y}px 0px ${pos.size}px ${color}`
      );
    } else {
      stars.push(`${pos.x}px ${pos.y}px 0px ${pos.size}px ${color}`);
    }
  }
  return stars.join(', ');
}

interface StarsProps {
  isDark?: boolean;
  settings?: ThemeSettings;
}

export const Stars = memo(function Stars({ isDark = true, settings }: StarsProps) {
  // Use provided settings or defaults based on theme
  const themeSettings = settings ?? (isDark ? DARK_THEME_SETTINGS : DEFAULT_SETTINGS);

  // Light theme star configurations - white color, tiny size, full opacity
  const lightStarConfigs = useMemo(() => ({
    small: {
      color: 'rgba(255, 255, 255, 1)', // Full opacity
      glowColor: 'rgba(255, 255, 255, 0.2)',
      size: 0.17, // 20% smaller
      glowRadius: 4,
    },
    medium: {
      color: 'rgba(255, 255, 255, 1)', // Full opacity
      glowColor: 'rgba(255, 255, 255, 0.4)',
      size: 0.54, // 20% smaller
      glowRadius: 7.5,
    },
    large: {
      color: 'rgba(255, 255, 255, 1)', // Full opacity
      glowColor: 'rgba(255, 255, 255, 0.6)',
      size: 0.82, // 20% smaller
      glowRadius: 20,
    },
  }), []);

  // Dark theme star configurations - tiny size, full opacity
  const darkStarConfigs = useMemo(() => ({
    small: {
      color: 'rgba(255, 255, 255, 1)', // Full opacity
      glowColor: 'rgba(255, 255, 255, 0.15)',
      size: 0.17, // 20% smaller
      glowRadius: 4,
    },
    medium: {
      color: 'rgba(255, 255, 255, 1)', // Full opacity
      glowColor: 'rgba(255, 255, 255, 0.25)',
      size: 0.54, // 20% smaller
      glowRadius: 7.5,
    },
    large: {
      color: 'rgba(255, 255, 255, 1)', // Full opacity
      glowColor: 'rgba(255, 255, 255, 0.4)',
      size: 0.82, // 20% smaller
      glowRadius: 17.5,
    },
  }), []);

  // Generate star POSITIONS once (never regenerate - positions stay constant)
  // All stars: 0% to 100% vertical range (full screen)
  const smallStarPositions = useMemo(() => {
    return generateStarPositions(80, 0.17, false, 0, 100);
  }, []); // Empty deps - positions generated once and never change

  const mediumStarPositions = useMemo(() => {
    return generateStarPositions(16, 0.54, false, 0, 100);
  }, []); // Empty deps - positions generated once and never change

  const largeStarPositions = useMemo(() => {
    return generateStarPositions(8, 0.82, true, 0, 100);
  }, []); // Empty deps - positions generated once and never change

  // Apply COLORS based on theme (positions stay the same, only colors change)
  const starsSmall = useMemo(() => {
    const color = isDark ? darkStarConfigs.small.color : lightStarConfigs.small.color;
    return positionsToBoxShadow(smallStarPositions, color);
  }, [isDark, darkStarConfigs.small.color, lightStarConfigs.small.color, smallStarPositions]);

  const starsMedium = useMemo(() => {
    const color = isDark ? darkStarConfigs.medium.color : lightStarConfigs.medium.color;
    return positionsToBoxShadow(mediumStarPositions, color);
  }, [isDark, darkStarConfigs.medium.color, lightStarConfigs.medium.color, mediumStarPositions]);


  return (
    <>
      <div
        id="stars"
        className={isDark ? '' : 'light-stars'}
        style={{
          boxShadow: starsSmall,
        }}
      />
      <div
        id="stars"
        className={isDark ? '' : 'light-stars'}
        style={{
          boxShadow: starsSmall,
        }}
      />
      <div
        id="stars2"
        className={isDark ? '' : 'light-stars'}
        style={{
          boxShadow: starsMedium,
        }}
      />
      <div
        id="stars2"
        className={isDark ? '' : 'light-stars'}
        style={{
          boxShadow: starsMedium,
        }}
      />
      {/* Large stars rendered as individual elements for explosion animations */}
      <ExplodingStars
        positions={largeStarPositions}
        color={isDark ? darkStarConfigs.large.color : lightStarConfigs.large.color}
        glowColor="rgba(255, 255, 255, 0.25)"
        isDark={isDark}
      />
    </>
  );
});
