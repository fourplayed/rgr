/**
 * SuccessMessage - Success feedback component
 */

export interface SuccessMessageProps {
  message: string;
}

/**
 * Success message component
 */
export function SuccessMessage({ message }: SuccessMessageProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
    >
      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {message}
    </div>
  );
}
