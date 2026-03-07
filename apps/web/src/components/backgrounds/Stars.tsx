/**
 * Stars - Animated starfield background for both dark and light modes
 * Generates random star positions using box-shadow with theme-aware colors
 */
import { useMemo, memo } from 'react';
import { type ThemeSettings } from './themeSettings';
import { ExplodingStars } from './ExplodingStars';

/**
 * Generate star positions (position and size data only, no color)
 * Returns array of {x, y, size, withGlow} objects
 * Extended horizontal spread (260vw) for seamless continuous flow
 */
function generateStarPositions(
  count: number,
  size: number,
  withGlow: boolean = false,
  yMinPercent: number = 0,
  yMaxPercent: number = 100
): Array<{ x: number; y: number; size: number; withGlow: boolean }> {
  const positions: Array<{ x: number; y: number; size: number; withGlow: boolean }> = [];
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
function positionsToBoxShadow(
  positions: Array<{ x: number; y: number; size: number; withGlow: boolean }>,
  color: string,
  glowColor?: string
): string {
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

export const Stars = memo(function Stars({ isDark = true, settings: _settings }: StarsProps) {
  // Light theme star configurations
  const lightStarConfigs = useMemo(
    () => ({
      small: {
        color: 'rgba(255, 255, 255, 1)',
        glowColor: 'rgba(255, 255, 255, 0.2)',
        size: 0.35,
        glowRadius: 6,
      },
      medium: {
        color: 'rgba(255, 255, 255, 1)',
        glowColor: 'rgba(255, 255, 255, 0.4)',
        size: 1.0,
        glowRadius: 12,
      },
      large: {
        color: 'rgba(255, 255, 255, 1)',
        glowColor: 'rgba(255, 255, 255, 0.6)',
        size: 1.6,
        glowRadius: 30,
      },
    }),
    []
  );

  // Dark theme star configurations
  const darkStarConfigs = useMemo(
    () => ({
      small: {
        color: 'rgba(255, 255, 255, 1)',
        glowColor: 'rgba(255, 255, 255, 0.15)',
        size: 0.35,
        glowRadius: 6,
      },
      medium: {
        color: 'rgba(255, 255, 255, 1)',
        glowColor: 'rgba(255, 255, 255, 0.25)',
        size: 1.0,
        glowRadius: 12,
      },
      large: {
        color: 'rgba(255, 255, 255, 1)',
        glowColor: 'rgba(255, 255, 255, 0.4)',
        size: 1.6,
        glowRadius: 28,
      },
    }),
    []
  );

  // Generate star POSITIONS once (never regenerate - positions stay constant)
  // All stars: 0% to 100% vertical range (full screen)
  const smallStarPositions = useMemo(() => {
    return generateStarPositions(80, 0.35, false, 0, 100);
  }, []); // Empty deps - positions generated once and never change

  const mediumStarPositions = useMemo(() => {
    return generateStarPositions(16, 1.0, false, 0, 100);
  }, []); // Empty deps - positions generated once and never change

  const largeStarPositions = useMemo(() => {
    return generateStarPositions(8, 1.6, true, 0, 100);
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
      {/* Small stars — primary + trailing copy for seamless loop */}
      <div
        id="stars"
        className={isDark ? '' : 'light-stars'}
        style={{
          boxShadow: starsSmall,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '260vw',
            top: 0,
            width: 1,
            height: 1,
            boxShadow: starsSmall,
          }}
        />
      </div>
      {/* Medium stars — primary + trailing copy for seamless loop */}
      <div
        id="stars2"
        className={isDark ? '' : 'light-stars'}
        style={{
          boxShadow: starsMedium,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '260vw',
            top: 0,
            width: 1,
            height: 1,
            boxShadow: starsMedium,
          }}
        />
      </div>
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
