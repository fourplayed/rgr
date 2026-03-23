/**
 * DepotHoverCard - Themed hover card displaying depot asset counts
 *
 * Features:
 * - Vision UI glassmorphism design with dark/light theme support
 * - Smooth flip-up animation from bottom (gun target style)
 * - Displays trailer and dolly counts in aligned table
 * - Bold depot abbreviations with consistent styling
 *
 * Design System:
 * - Dark theme: Navy gradient with backdrop blur and shadow
 * - Light theme: Grey gradient without blur or shadow
 * - Follows VisionCard styling patterns
 *
 * Usage:
 * Rendered as a Mapbox popup on depot marker hover
 */
import React from 'react';
import type { DepotLocation } from '@/constants/fleetMap';

export interface DepotHoverCardProps {
  /** Depot information to display */
  depot: DepotLocation;
  /** Theme mode - controls dark/light styling */
  isDark?: boolean;
}

/**
 * DepotHoverCard - Compact card showing depot asset counts on hover
 *
 * Design System:
 * - Vision UI glassmorphism with theme-aware gradients
 * - Dark theme: Navy gradient with backdrop blur and shadow
 * - Light theme: Grey gradient with solid appearance
 * - Flip-up animation with 3D perspective
 * - Bold text for improved readability
 */
export const DepotHoverCard = React.memo<DepotHoverCardProps>(({ depot, isDark = true }) => {
  // Get depot abbreviation
  const getAbbreviation = (name: string): string => {
    const abbrevMap: Record<string, string> = {
      Perth: 'PER',
      Newman: 'NEW',
      Hedland: 'HED',
      Karratha: 'KTA',
    };
    return abbrevMap[name] || name.substring(0, 3).toUpperCase();
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
  const borderBottomColor = isDark ? 'rgba(235, 235, 235, 0.15)' : 'rgba(107, 114, 128, 0.3)';

  return (
    <div
      className="depot-hover-card animate-fade-in px-3 py-3 rounded-[20px] border overflow-hidden transition-all duration-300 ease-out"
      style={{
        position: 'relative',
        zIndex: 1000,
        ...bgStyle,
        borderColor,
        borderWidth: isDark ? '1px' : '1.5px',
        color: textColor,
      }}
    >
      {/* Depot Abbreviation - Bold text matching label style */}
      <div
        className="text-sm font-bold text-center mb-2 pb-2"
        style={{
          color: secondaryTextColor,
          borderBottom: `1px solid ${borderBottomColor}`,
        }}
      >
        {getAbbreviation(depot.name)}
      </div>

      {/* Asset Counts - Table for alignment */}
      <table className="text-xs w-full font-bold" style={{ color: secondaryTextColor }}>
        <tbody>
          <tr>
            <td className="pr-2">Trailers:</td>
            <td className="text-right" style={{ color: textColor }}>
              {depot.trailers}
            </td>
          </tr>
          <tr>
            <td className="pr-2">Dollies:</td>
            <td className="text-right" style={{ color: textColor }}>
              {depot.dollies}
            </td>
          </tr>
        </tbody>
      </table>

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

        .depot-hover-card {
          transform-origin: bottom center;
        }

        .animate-fade-in {
          animation: smoothSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
});

DepotHoverCard.displayName = 'DepotHoverCard';

export default DepotHoverCard;
