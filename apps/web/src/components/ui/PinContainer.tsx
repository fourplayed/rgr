'use client';
import React from 'react';
import { motion } from 'motion/react';
import type { DepotAsset } from '@/components/dashboard/map/depotTypes';

export const PinContainer = ({
  title,
  color,
  assetCount,
  isHovered = false,
  hideLabel = false,
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
  hideLabel?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  onAssetClick?: (asset: DepotAsset) => void;
  activeDepot?: string | null;
  onPin?: () => void;
  onDismiss?: () => void;
}) => {
  const c = color || '#06b6d4';

  return (
    <div className="relative group/pin z-50 pointer-events-none">
      <PinPerspective title={title} color={c} assetCount={assetCount} hovered={isHovered} hideLabel={hideLabel} />
    </div>
  );
};

const PinPerspective = ({
  title,
  color,
  assetCount,
  hovered,
  hideLabel = false,
}: {
  title?: string | undefined;
  color: string;
  assetCount?: number | undefined;
  hovered: boolean;
  hideLabel?: boolean;
}) => {
  return (
    <motion.div className="pointer-events-none w-96 h-80 flex items-center justify-center z-[30]">
      <div className="w-full h-full -mt-7 flex-none inset-0">
        {/* Label + count badge — positioned at top of stem */}
        <div
          className="absolute inset-x-0 flex justify-center transition-all duration-200 ease-out"
          style={{
            bottom: '50%',
            marginBottom: hovered ? '64px' : '38px',
            opacity: hideLabel ? 0 : 1,
            transform: hideLabel ? 'scale(0.85)' : 'scale(1)',
            transition: 'opacity 0.25s ease-out, transform 0.25s ease-out, margin-bottom 0.5s ease-out',
          }}
        >
          <div className="relative inline-flex flex-col items-center">
            <div
              className={`flex items-center gap-1.5 z-20 transition-all duration-300 ease-out ${hovered ? 'px-3 py-1.5' : 'px-2 py-1'}`}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1.5px solid ${color}66`,
                boxShadow: `0 0 10px ${color}44, 0 4px 12px rgba(0,0,0,0.4)`,
                borderRadius: 20,
                marginTop: -4,
              }}
            >
              {title && (
                <span
                  className={`font-bold text-white/70 uppercase transition-all duration-300 ease-out ${hovered ? 'text-[14px] tracking-[0.08em]' : 'text-[11px] tracking-[0.06em]'}`}
                  style={{ fontFamily: "'Lato', sans-serif", whiteSpace: 'nowrap' }}
                >
                  {title}
                </span>
              )}
              <span
                className={`font-bold text-white transition-all duration-300 ease-out ${hovered ? 'text-[22px]' : 'text-[16px]'}`}
                style={{ lineHeight: 1 }}
              >
                {(assetCount ?? 0) >= 1000 ? `${Math.round((assetCount ?? 0) / 1000)}k` : (assetCount ?? 0)}
              </span>
            </div>
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
