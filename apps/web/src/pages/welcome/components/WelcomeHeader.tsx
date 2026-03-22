/**
 * WelcomeHeader - Greeting section with user name and intro text
 */
import { motion } from 'motion/react';
import type { Profile } from '@rgr/shared';
import { GLASS_CARD, ENTRANCE_EASE } from '../styles';

interface WelcomeHeaderProps {
  user: Profile | null;
  isDark: boolean;
  delay: number;
}

export function WelcomeHeader({ user, isDark, delay }: WelcomeHeaderProps) {
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'there';
  const cardStyle = isDark ? GLASS_CARD.dark : GLASS_CARD.light;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: ENTRANCE_EASE }}
      className="text-center px-6 pt-16 pb-8 max-w-3xl mx-auto"
    >
      {/* Avatar / Initials */}
      <div
        className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
        style={{
          ...cardStyle,
          background: isDark
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(45, 212, 191, 0.2))'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(45, 212, 191, 0.3))',
          color: '#f8fafc',
          fontFamily: "'Code-Bold', monospace",
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>

      {/* Greeting */}
      <h1
        className="text-4xl md:text-5xl font-bold mb-3"
        style={{
          fontFamily: "'Code-Bold', monospace",
          background: isDark
            ? 'linear-gradient(90deg, #cbd5e1 0%, #ffffff 40%, #cbd5e1 80%)'
            : 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 40%, #1e3a8a 80%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Welcome, {displayName}
      </h1>

      {/* Subtitle */}
      <p
        className="text-lg md:text-xl"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: isDark ? '#94a3b8' : 'rgba(255, 255, 255, 0.75)',
        }}
      >
        Here's your fleet at a glance
      </p>
    </motion.section>
  );
}
