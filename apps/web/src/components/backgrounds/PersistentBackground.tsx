/**
 * PersistentBackground - Renders gradient + Stars once at app root
 *
 * Lives outside <Routes> so it never unmounts during navigation.
 * This prevents stars from restarting their animation and the gradient
 * from flashing when transitioning between login and dashboard.
 */
import { memo } from 'react';
import { Stars } from './Stars';
import { useTheme } from '@/hooks/useTheme';
import { useDevToolsStore } from '@/stores/devToolsStore';

export const PersistentBackground = memo(function PersistentBackground() {
  const { isDark } = useTheme();
  const lightGradient = useDevToolsStore((s) => s.lightGradient);
  const darkGradient = useDevToolsStore((s) => s.darkGradient);
  const gradient = isDark ? darkGradient : lightGradient;

  return (
    <div
      className="fixed inset-0"
      style={{
        background: `linear-gradient(to bottom, ${gradient.top} 0%, ${gradient.upperMiddle} 33%, ${gradient.lowerMiddle} 66%, ${gradient.bottom} 100%)`,
        transition: 'background 1.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <Stars isDark={isDark} />
    </div>
  );
});
