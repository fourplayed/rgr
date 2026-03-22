import React from 'react';
import { motion } from 'motion/react';

interface MinimizedPillProps {
  depotName: string;
  depotColor: string;
  assetCount: number;
  isDark?: boolean;
  onClick: () => void;
}

export const MinimizedPill: React.FC<MinimizedPillProps> = ({
  depotName,
  depotColor,
  assetCount,
  isDark = true,
  onClick,
}) => {
  const initial = depotName.charAt(0).toUpperCase();
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      aria-label={`${depotName}, ${assetCount} assets, click to expand`}
      className="pointer-events-auto cursor-pointer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: isDark ? 'rgba(0,20,50,0.9)' : '#ffffff',
        border: `1px solid ${isDark ? depotColor + '4d' : 'rgba(107,114,128,0.4)'}`,
        color: isDark ? 'rgba(255,255,255,0.7)' : '#374151',
        fontSize: 12,
        fontWeight: 600,
        boxShadow: isDark ? `0 4px 12px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: depotColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          fontWeight: 800,
          color: 'white',
        }}
      >
        {initial}
      </span>
      <span>{assetCount}</span>
      <span style={{ opacity: 0.5 }}>↗</span>
    </motion.button>
  );
};
