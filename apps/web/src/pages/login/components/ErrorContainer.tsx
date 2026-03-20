/**
 * ErrorContainer - Error display component positioned below card
 * Automatically fades out after 5 seconds
 */
import { useState, useEffect, useRef } from 'react';
import { CARD_HEIGHT } from '../styles';

export interface ErrorContainerProps {
  errors: string[];
  onDismiss?: () => void;
}

/**
 * Error container displayed below card - absolutely positioned
 * Fades out automatically after 5 seconds
 */
export function ErrorContainer({ errors, onDismiss }: ErrorContainerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (errors.length > 0) {
      setIsVisible(true);

      const timers: ReturnType<typeof setTimeout>[] = [];
      timers.push(
        setTimeout(() => {
          setIsVisible(false);
          timers.push(setTimeout(() => onDismissRef.current?.(), 500));
        }, 5000)
      );

      return () => timers.forEach(clearTimeout);
    }
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className="absolute bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm w-full max-w-[400px] transition-opacity duration-500"
      style={{
        top: `calc(50% + ${CARD_HEIGHT / 2 + 16}px)`,
        transform: 'translateX(-50%)',
        left: '50%',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="space-y-1">
        {errors.map((error, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>{error}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
