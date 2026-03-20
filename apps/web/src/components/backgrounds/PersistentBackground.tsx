/**
 * PersistentBackground - Renders gradient once at app root
 *
 * Lives outside <Routes> so it never unmounts during navigation.
 * This prevents the gradient from flashing when transitioning between pages.
 *
 * Dark mode: WebGL LightPillar animation.
 * Light mode: CSS gradient.
 */
import { memo } from 'react';
import LightPillar from './LightPillar';
import { useTheme } from '@/hooks/useTheme';
import { useDevToolsStore } from '@/stores/devToolsStore';

export const PersistentBackground = memo(function PersistentBackground() {
  const { isDark } = useTheme();
  const lightGradient = useDevToolsStore((s) => s.lightGradient);
  const darkBgGradient = useDevToolsStore((s) => s.darkBgGradient);
  const pillarSettings = useDevToolsStore((s) => s.pillarSettings);
  const lightPillarSettings = useDevToolsStore((s) => s.lightPillarSettings);

  return (
    <div
      className="fixed inset-0"
      style={{
        background: isDark
          ? `linear-gradient(to bottom, ${darkBgGradient.top} 0%, ${darkBgGradient.upperMiddle} 33%, ${darkBgGradient.lowerMiddle} 66%, ${darkBgGradient.bottom} 100%)`
          : `linear-gradient(to bottom, ${lightGradient.top} 0%, ${lightGradient.upperMiddle} 33%, ${lightGradient.lowerMiddle} 66%, ${lightGradient.bottom} 100%)`,
        transition: 'background 1.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {isDark && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '110%' }}>
          <LightPillar
            topColor={pillarSettings.topColor}
            bottomColor={pillarSettings.bottomColor}
            intensity={pillarSettings.intensity}
            rotationSpeed={pillarSettings.rotationSpeed}
            interactive={false}
            glowAmount={pillarSettings.glowAmount}
            pillarWidth={pillarSettings.pillarWidth}
            pillarHeight={pillarSettings.pillarHeight}
            noiseIntensity={0}
            pillarRotation={90}
          />
        </div>
      )}
      {!isDark && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '110%' }}>
          <LightPillar
            topColor={lightPillarSettings.topColor}
            bottomColor={lightPillarSettings.bottomColor}
            intensity={lightPillarSettings.intensity}
            rotationSpeed={lightPillarSettings.rotationSpeed}
            interactive={false}
            glowAmount={lightPillarSettings.glowAmount}
            pillarWidth={lightPillarSettings.pillarWidth}
            pillarHeight={lightPillarSettings.pillarHeight}
            noiseIntensity={0}
            pillarRotation={90}
          />
        </div>
      )}
    </div>
  );
});
