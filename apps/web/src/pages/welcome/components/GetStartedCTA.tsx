/**
 * GetStartedCTA - Chrome-gradient button to dismiss onboarding and enter dashboard
 */
import { motion } from 'motion/react';
import { ENTRANCE_EASE } from '../styles';

interface GetStartedCTAProps {
  isDark: boolean;
  delay: number;
  onGetStarted: () => void;
}

export function GetStartedCTA({ isDark, delay, onGetStarted }: GetStartedCTAProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: ENTRANCE_EASE }}
      className="px-6 pt-4 pb-16 max-w-4xl mx-auto w-full flex flex-col items-center"
    >
      <button
        onClick={onGetStarted}
        className="group relative px-10 py-3.5 rounded-lg font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '1rem',
          letterSpacing: '0.04em',
          background: isDark
            ? 'linear-gradient(135deg, #152a6b, #1e3a8a, #2563eb)'
            : 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)',
          boxShadow: isDark
            ? '0 4px 24px rgba(37, 99, 235, 0.3), 0 0 40px rgba(59, 130, 246, 0.15)'
            : '0 4px 24px rgba(37, 99, 235, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)',
        }}
      >
        {/* Chrome shimmer overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 2s ease-in-out infinite',
          }}
        />

        {/* Pulsing glow ring */}
        <div
          className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
          style={{
            background: 'transparent',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />

        <span className="relative z-10">Go to Dashboard</span>
      </button>

      <p
        className="mt-4 text-sm"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: isDark ? '#475569' : 'rgba(255, 255, 255, 0.4)',
        }}
      >
        You can revisit settings anytime
      </p>
    </motion.section>
  );
}
