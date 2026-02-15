/**
 * ThemedInput - Themed input component for login forms
 */
import type { InputHTMLAttributes } from 'react';
import { INPUT_STYLES } from '../styles';

export interface ThemedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isDark: boolean;
}

/**
 * Themed input component for login form (no inline errors)
 */
export function ThemedInput({
  label,
  isDark,
  error: _error, // Ignore error prop - errors shown below card
  id,
  name,
  ...props
}: ThemedInputProps) {
  const inputId = id || name;
  const inputClasses = isDark
    ? 'w-full px-4 py-3 rounded-lg text-white placeholder:text-gray-500 focus:outline-none transition-all duration-200 themed-input-dark themed-input'
    : 'w-full px-4 py-3 rounded-lg text-slate-900 placeholder:text-white focus:outline-none transition-all duration-200 themed-input';

  // Use same simple border behavior for both themes
  const inputStyle = isDark ? INPUT_STYLES.dark : INPUT_STYLES.light;

  const labelClasses = isDark ? 'text-slate-200 transition-colors duration-400' : 'text-white transition-colors duration-400';

  return (
    <div className="space-y-1">
      <style>{`
        .themed-input-dark:focus {
          background-color: rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
      {label && (
        <label htmlFor={inputId} className={`block text-sm font-medium ${labelClasses}`}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        className={inputClasses}
        style={inputStyle}
        {...props}
      />
    </div>
  );
}
