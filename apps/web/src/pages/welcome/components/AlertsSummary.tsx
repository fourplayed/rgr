/**
 * AlertsSummary - Priority alerts section (placeholder for now)
 */
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { GLASS_CARD, ENTRANCE_EASE } from '../styles';

interface AlertsSummaryProps {
  isDark: boolean;
  delay: number;
}

export function AlertsSummary({ isDark, delay }: AlertsSummaryProps) {
  const cardStyle = isDark ? GLASS_CARD.dark : GLASS_CARD.light;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: ENTRANCE_EASE }}
      className="px-6 pb-6 max-w-4xl mx-auto w-full"
    >
      <h2
        className="text-sm uppercase tracking-widest mb-4 px-1"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: isDark ? '#64748b' : 'rgba(255, 255, 255, 0.5)',
          letterSpacing: '0.15em',
        }}
      >
        Alerts
      </h2>

      <div
        className="flex items-center gap-4 p-5"
        style={{
          ...cardStyle,
          borderLeft: '2px solid #2dd4bf',
        }}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(45, 212, 191, 0.15)' }}
        >
          <ShieldCheck className="w-5 h-5" style={{ color: '#2dd4bf' }} />
        </div>

        <div>
          <div
            className="font-medium mb-0.5"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: isDark ? '#e2e8f0' : '#ffffff',
              fontSize: '0.95rem',
            }}
          >
            No urgent alerts
          </div>
          <div
            className="text-sm"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: isDark ? '#64748b' : 'rgba(255, 255, 255, 0.55)',
            }}
          >
            Your fleet is operating normally. We'll notify you when something needs attention.
          </div>
        </div>
      </div>
    </motion.section>
  );
}
