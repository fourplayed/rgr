'use client';
import React from 'react';
import { motion } from 'motion/react';
import type { DepotAsset } from '@/components/dashboard/map/depotTypes';

export const PinContainer = ({
  title,
  color,
  assetCount,
  isHovered = false,
  onClusterClick,
}: {
  children?: React.ReactNode;
  title?: string;
  href?: string;
  className?: string;
  containerClassName?: string;
  color?: string;
  assetCount?: number;
  assets?: DepotAsset[];
  isDark?: boolean;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  onAssetClick?: (asset: DepotAsset) => void;
  activeDepot?: string | null;
  onPin?: () => void;
  onDismiss?: () => void;
  onClusterClick?: () => void;
}) => {
  const c = color || '#06b6d4';

  return (
    <div className="relative group/pin z-50 pointer-events-none">
      <PinPerspective title={title} color={c} assetCount={assetCount} hovered={isHovered} onClusterClick={onClusterClick} />
    </div>
  );
};

const PinPerspective = ({
  title,
  color,
  assetCount,
  hovered,
  onClusterClick,
}: {
  title?: string | undefined;
  color: string;
  assetCount?: number | undefined;
  hovered: boolean;
  onClusterClick?: () => void;
}) => {
  return (
    <motion.div className="pointer-events-none w-96 h-80 flex items-center justify-center z-[60]">
      <div className="w-full h-full -mt-7 flex-none inset-0">
        {/* Label + count badge — positioned at top of stem */}
        <div
          className="absolute inset-x-0 flex justify-center transition-all duration-200 ease-out"
          style={{ bottom: '50%', marginBottom: hovered ? '64px' : '38px' }}
        >
          <div className="relative inline-flex flex-col items-center">
            {/* Label hidden temporarily */}
            {(
              <span
                className={`flex items-center justify-center px-1.5 font-bold rounded-full text-white mt-[-4px] z-20 transition-all duration-300 ease-out ${hovered ? 'min-w-[58px] h-[58px] text-[30px]' : 'min-w-[39px] h-[39px] text-[22px]'}`}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1.5px solid ${color}66`,
                  boxShadow: `0 0 10px ${color}44, 0 4px 12px rgba(0,0,0,0.4)`,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onClick={(e) => { e.stopPropagation(); onClusterClick?.(); }}
              >
                {(assetCount ?? 0) >= 1000 ? `${Math.round((assetCount ?? 0) / 1000)}k` : (assetCount ?? 0)}
              </span>
            )}
          </div>
        </div>

        {/* Stem + glow dot */}
        <>
          <motion.div
            className="absolute right-1/2 bottom-1/2 translate-y-[14px] blur-[2px] transition-all duration-500 ease-out"
            style={{
              background: `linear-gradient(to bottom, transparent, ${color})`,
              width: '1px',
              height: hovered ? '104px' : '52px',
            }}
          />
          <motion.div
            className="absolute right-1/2 bottom-1/2 translate-y-[14px] transition-all duration-500 ease-out"
            style={{
              background: `linear-gradient(to bottom, transparent, ${color})`,
              width: '1px',
              height: hovered ? '104px' : '52px',
            }}
          />
          <motion.div
            className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 translate-y-[14px] rounded-full z-40 blur-[3px]"
            style={{ background: color, width: '4px', height: '4px' }}
          />
          <motion.div
            className="absolute right-1/2 translate-x-[0.5px] bottom-1/2 translate-y-[14px] rounded-full z-40"
            style={{
              background: `color-mix(in srgb, ${color}, white 40%)`,
              width: '2px',
              height: '2px',
            }}
          />
        </>
      </div>
    </motion.div>
  );
};
