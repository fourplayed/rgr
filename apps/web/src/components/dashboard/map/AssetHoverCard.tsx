/**
 * AssetHoverCard - Themed hover card displaying asset details
 *
 * Features:
 * - Vision UI glassmorphism design with dark/light theme support
 * - Smooth flip-up animation from bottom (gun target style)
 * - Displays asset name and status with proper formatting
 * - Theme-aware colors and styling
 *
 * Design System:
 * - Dark theme: Navy gradient with backdrop blur and shadow
 * - Light theme: Grey gradient without blur or shadow
 * - Follows VisionCard styling patterns
 *
 * Usage:
 * Rendered as a Mapbox popup on asset marker hover
 */
import React from 'react';

export interface AssetHoverCardProps {
  /** Asset information to display */
  asset: {
    name: string;
    status: string;
  };
  /** Theme mode - controls dark/light styling */
  isDark?: boolean;
}

/**
 * AssetHoverCard - Compact card showing asset details on hover
 *
 * Design System:
 * - Vision UI glassmorphism with theme-aware gradients
 * - Dark theme: Navy gradient with backdrop blur and shadow
 * - Light theme: Grey gradient with solid appearance
 * - Flip-up animation with 3D perspective
 * - Bold text for improved readability
 */
export const AssetHoverCard = React.memo<AssetHoverCardProps>(({ asset, isDark = true }) => {
  // Format status text: replace underscores with spaces and capitalize each word
  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Theme-aware background styling (matching VisionCard pattern)
  const bgStyle = isDark
    ? {
        // Dark theme: vertical gradient from dark navy to medium blue (100% opacity)
        background: 'linear-gradient(to bottom, rgb(0, 0, 40) 0%, rgb(10, 38, 84) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
      }
    : {
        // Light theme: grey to light grey gradient (top to bottom)
        background: 'linear-gradient(to bottom, #d1d5db 0%, #f3f4f6 100%)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: 'none',
      };

  // Theme-aware border colors (matching VisionCard)
  const borderColor = isDark
    ? 'rgba(235, 235, 235, 0.15)' // Dark: subtle chrome outline
    : 'rgba(107, 114, 128, 0.75)'; // Light: gray-500 at 75% opacity

  // Theme-aware text colors
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const secondaryTextColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)';

  return (
    <div
      className="asset-hover-card animate-fade-in px-3 py-2 rounded-[20px] border overflow-hidden transition-all duration-300 ease-out"
      style={{
        position: 'relative',
        zIndex: 1000,
        ...bgStyle,
        borderColor,
        borderWidth: isDark ? '1px' : '1.5px',
        color: textColor,
      }}
    >
      {/* Asset Name - Bold primary text */}
      <p className="font-bold text-sm mb-0.5" style={{ color: textColor }}>
        {asset.name}
      </p>

      {/* Asset Status - Bold smaller secondary text */}
      <p className="text-xs font-bold" style={{ color: secondaryTextColor }}>
        {formatStatus(asset.status)}
      </p>

      {/* Inline animation styles - smooth slide up */}
      <style>{`
        @keyframes smoothSlideUp {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .asset-hover-card {
          transform-origin: bottom center;
        }

        .animate-fade-in {
          animation: smoothSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
});

AssetHoverCard.displayName = 'AssetHoverCard';

export default AssetHoverCard;
