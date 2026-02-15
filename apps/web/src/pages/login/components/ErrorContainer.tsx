/**
 * ErrorContainer - Error display component positioned below card
 * Automatically fades out after 5 seconds
 */
import { useState, useEffect } from 'react';
import { CARD_HEIGHT } from '../styles';

export interface ErrorContainerProps {
  errors: string[];
  isDark?: boolean; // Optional - no longer used, kept for backward compatibility
}

/**
 * Error container displayed below card - absolutely positioned
 * Fades out automatically after 5 seconds
 */
export function ErrorContainer({ errors }: ErrorContainerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (errors.length > 0) {
      // Reset visibility when new errors appear
      setIsVisible(true);

      // Set timer to fade out after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [errors]);

  if (errors.length === 0) return null;

  // Use dark theme styling for both themes
  const bgColor = 'bg-red-900/30';
  const borderColor = 'border-red-700';
  const textColor = 'text-red-300';

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`absolute ${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded-lg text-sm w-full max-w-[400px] transition-opacity duration-500`}
      style={{
        top: `calc(50% + ${CARD_HEIGHT / 2 + 16}px)`,
        transform: 'translateX(-50%)',
        left: '50%',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="space-y-1">
          {errors.map((error, idx) => (
            <p key={idx}>{error}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
