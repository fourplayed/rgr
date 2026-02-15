/**
 * VisionCard - Vision UI styled glassmorphism card
 * Updated to use RGR color palette from COLOR_PALETTE.md
 *
 * Light Theme Implementation:
 * - White background with subtle transparency for depth
 * - Light gray border with enhanced shadow for definition
 * - Smooth hover effect with subtle lift
 * - Maintains glassmorphism aesthetic in both themes
 */
import React from 'react';

export interface VisionCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  /** Theme mode - when true, uses dark theme; when false, uses light theme */
  isDark?: boolean;
}

export const VisionCard = React.memo<VisionCardProps>(({
  children,
  className = '',
  noPadding = false,
  isDark = true,
}) => {
  // Login card-style backgrounds - gradient filled for both themes
  // Dark theme: dark blue to lighter blue gradient (matching login card)
  // Light theme: chrome metallic gradient effect (matching login card)
  const bgStyle = isDark
    ? {
        // Dark theme: vertical gradient from dark navy to medium blue (100% opacity)
        background: 'linear-gradient(to bottom, rgb(0, 0, 40) 0%, rgb(10, 38, 84) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      }
    : {
        // Light theme: grey to light grey gradient (top to bottom) - no shadow to avoid corner artifacts
        background: 'linear-gradient(to bottom, #d1d5db 0%, #f3f4f6 100%)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: 'none',
      };

  // Theme-aware border colors (matching login card)
  const borderColor = isDark
    ? 'rgba(235, 235, 235, 0.15)' // Dark: subtle chrome outline
    : 'rgba(107, 114, 128, 0.75)'; // Light: gray-500 at 75% opacity

  return (
    <div
      className={`
        border rounded-[20px] overflow-hidden
        transition-all duration-300 ease-out
        ${noPadding ? '' : 'p-5'}
        ${className}
      `}
      style={{
        ...bgStyle,
        borderColor,
        borderWidth: isDark ? '1px' : '1.5px',
      }}
    >
      {children}
    </div>
  );
});

VisionCard.displayName = 'VisionCard';

export default VisionCard;
