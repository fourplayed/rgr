"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { DepotAsset } from "@/components/dashboard/map/depotTypes";
import { DepotAssetPanel } from "@/components/dashboard/map/DepotAssetPanel";
import { MinimizedPill } from "@/components/dashboard/map/MinimizedPill";

export const PinContainer = ({
  children,
  title,
  href,
  className,
  containerClassName,
  color,
  assetCount,
  assets,
  isDark,
  onHoverChange,
  onAssetClick,
  activeDepot,
  onPin,
  onDismiss,
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
  onHoverChange?: (hovered: boolean) => void;
  onAssetClick?: (asset: DepotAsset) => void;
  activeDepot?: string | null;
  onPin?: () => void;
  onDismiss?: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  const handleHoverChange = (v: boolean) => {
    setHovered(v);
    onHoverChange?.(v);
  };

  const transform = hovered
    ? "translate(-50%,-50%) rotateX(40deg) scale(0.8)"
    : "translate(-50%,-50%) rotateX(0deg) scale(1)";

  return (
    <div
      className={cn(
        "relative z-50 pointer-events-none",
        containerClassName
      )}
    >
      {children && (
        <div
          style={{
            perspective: "1000px",
            transform: "rotateX(70deg) translateZ(0deg)",
          }}
          className="absolute left-1/2 top-1/2 ml-[0.09375rem] mt-4 -translate-x-1/2 -translate-y-1/2"
        >
          <div
            style={{ transform }}
            className="absolute left-1/2 p-4 top-1/2 flex justify-start items-start rounded-2xl shadow-[0_8px_16px_rgb(0_0_0/0.4)] bg-black border border-white/[0.1] transition duration-700 overflow-hidden"
          >
            <div className={cn("relative z-50", className)}>{children}</div>
          </div>
        </div>
      )}
      <PinPerspective title={title} href={href} color={color} assetCount={assetCount} assets={assets} isDark={isDark} hovered={hovered} setHovered={handleHoverChange} onAssetClick={onAssetClick} activeDepot={activeDepot} onPin={onPin} onDismiss={onDismiss} />
    </div>
  );
};

export const PinPerspective = ({
  title,
  href,
  color,
  assetCount,
  assets,
  isDark = true,
  hovered,
  setHovered,
  onAssetClick,
  activeDepot,
  onPin,
  onDismiss,
}: {
  title?: string | undefined;
  href?: string | undefined;
  color?: string | undefined;
  assetCount?: number | undefined;
  assets?: DepotAsset[] | undefined;
  isDark?: boolean | undefined;
  hovered: boolean;
  setHovered: (v: boolean) => void;
  onAssetClick?: ((asset: DepotAsset) => void) | undefined;
  activeDepot?: string | null | undefined;
  onPin?: (() => void) | undefined;
  onDismiss?: (() => void) | undefined;
}) => {
  const [pinned, setPinned] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const c = color || "cyan";
  const isCyan = !color || color === "cyan";

  const ringBg = isCyan ? "rgba(14, 165, 233, 0.08)" : `${c}14`;
  const stemGradient = isCyan
    ? "linear-gradient(to bottom, transparent, rgb(6, 182, 212))"
    : `linear-gradient(to bottom, transparent, ${c})`;

  const showPanel = pinned && !minimized;
  const showPreview = hovered && !pinned && !minimized && (assets?.length ?? 0) > 0;
  const showMinimized = minimized;
  const isActive = hovered || pinned || minimized;

  // Auto-dismiss when another depot becomes active
  useEffect(() => {
    if (activeDepot !== null && activeDepot !== title && (pinned || minimized)) {
      setPinned(false);
      setMinimized(false);
    }
  }, [activeDepot, title, pinned, minimized]);

  // Esc key dismiss
  useEffect(() => {
    if (!pinned && !minimized) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setMinimized(false);
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pinned, minimized, onDismiss]);

  const handleDomeClick = useCallback(() => {
    if (!pinned && !minimized) {
      setPinned(true);
      setMinimized(false);
      onPin?.();
    }
  }, [pinned, minimized, onPin]);

  const handleClose = useCallback(() => {
    setPinned(false);
    setMinimized(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleAssetClick = useCallback((asset: DepotAsset) => {
    // Fly to asset and minimize
    onAssetClick?.(asset);
    setMinimized(true);
  }, [onAssetClick]);

  const handlePillClick = useCallback(() => {
    setMinimized(false);
    setPinned(true);
    onPin?.();
  }, [onPin]);

  return (
    <motion.div className="pointer-events-none w-96 h-80 flex items-center justify-center z-[60]">
      <div className="w-full h-full -mt-7 flex-none inset-0">
        {/* Label pill + count badge */}
        <div
          className="absolute inset-x-0 flex justify-center z-10 transition-all duration-500 ease-out"
          style={{ bottom: "50%", marginBottom: "30px" }}
        >
          <span
            className={cn(
              "relative whitespace-nowrap text-white text-base font-bold py-0.5 px-3.5 rounded-full ring-1 ring-white/10 transition-all duration-500",
              isActive && "-translate-y-16"
            )}
            style={{ backgroundColor: `${c}d0`, textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.4)" }}
          >
            {title}
            {assetCount != null && assetCount > 0 && (
              <span
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center min-w-[40px] h-[40px] px-2 text-[18px] font-bold rounded-full text-white ring-1 ring-white/20"
                style={{
                  top: "calc(100% + 4px)",
                  backgroundColor: '#1e293b',
                  border: `2px solid ${c}`,
                  boxShadow: `0 0 8px ${c}88`,
                }}
              >
                {assetCount >= 1000 ? `${Math.round(assetCount / 1000)}k` : assetCount}
              </span>
            )}
          </span>
        </div>

        {/* Hover preview — compact panel (status bar only, no list) */}
        <AnimatePresence>
          {showPreview && assets && assets.length > 0 && (
            <div
              className="absolute inset-x-0 flex justify-center z-20"
              style={{ bottom: "50%", marginBottom: "100px" }}
            >
              <DepotAssetPanel
                assets={assets}
                depotName={title || ''}
                depotColor={c}
                isDark={isDark}
                compact
              />
            </div>
          )}
        </AnimatePresence>

        {/* Full panel — pinned open */}
        <AnimatePresence>
          {showPanel && assets && assets.length > 0 && (
            <div
              className="absolute inset-x-0 flex justify-center z-20"
              style={{ bottom: "50%", marginBottom: "100px" }}
            >
              <DepotAssetPanel
                assets={assets}
                depotName={title || ''}
                depotColor={c}
                isDark={isDark}
                onAssetClick={handleAssetClick}
                onClose={handleClose}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Minimized pill */}
        <AnimatePresence>
          {showMinimized && (
            <div
              className="absolute inset-x-0 flex justify-center z-20"
              style={{ bottom: "50%", marginBottom: "100px" }}
            >
              <MinimizedPill
                depotName={title || ''}
                depotColor={c}
                assetCount={assets?.length ?? 0}
                isDark={isDark}
                onClick={handlePillClick}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Invisible dome — hover + click target */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { if (!pinned && !minimized) setHovered(false); }}
          onClick={handleDomeClick}
          className="absolute left-1/2 bottom-1/2 rounded-full pointer-events-auto cursor-pointer"
          style={{
            zIndex: 51,
            width: pinned ? "300px" : "120px",
            height: pinned ? "400px" : "120px",
            transform: "translate(-50%, 50%)",
            transition: "width 0.3s, height 0.3s",
          }}
        />

        {/* Pulsing rings — 3D perspective-flattened to appear flat on the map ground plane.
            Strategy: a plain wrapper div applies perspective + rotateX to create the 3D
            foreshortening. The motion.div inside only animates opacity + scale, so
            framer-motion never overwrites the parent's 3D transform context. The rings
            are true circles that look like ground-plane ovals through perspective. */}
        <div
          style={{
            zIndex: 50,
            perspective: "600px",
            transformStyle: "preserve-3d",
          }}
          className="absolute left-1/2 bottom-1/2 -translate-x-1/2 translate-y-[14px]"
        >
          {/* Shared 3D rotation wrapper — rotates all rings to lay flat */}
          <div
            style={{
              transform: "rotateX(72deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {[0, 2, 4].map((delay) => (
              <div
                key={delay}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 0], scale: 1 }}
                  transition={{ duration: 6, repeat: Infinity, delay }}
                  className="w-24 h-24 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${ringBg} 0%, ${ringBg} 40%, transparent 70%)`,
                    boxShadow: `0 0 20px 4px ${ringBg}`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Stem — short default, grows taller + thicker on hover */}
        <>
          <motion.div
            className="absolute right-1/2 bottom-1/2 translate-y-[14px] blur-[2px] transition-all duration-500 ease-out"
            style={{
              background: stemGradient,
              width: hovered ? "2px" : "1px",
              height: hovered ? "96px" : "32px",
            }}
          />
          <motion.div
            className="absolute right-1/2 bottom-1/2 translate-y-[14px] transition-all duration-500 ease-out"
            style={{
              background: stemGradient,
              width: hovered ? "2px" : "1px",
              height: hovered ? "96px" : "32px",
            }}
          />
          {/* Outer glow bloom at base */}
          <motion.div
            className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 translate-y-[14px] rounded-full z-39 blur-[8px] transition-all duration-300"
            style={{
              background: c,
              width: hovered ? "16px" : "10px",
              height: hovered ? "16px" : "10px",
              opacity: hovered ? 0.7 : 0.45,
            }}
          />
          {/* Mid glow at base */}
          <motion.div
            className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 translate-y-[14px] rounded-full z-40 blur-[3px] transition-all duration-300"
            style={{
              background: c,
              width: hovered ? "6px" : "4px",
              height: hovered ? "6px" : "4px",
            }}
          />
          {/* Core dot at base */}
          <motion.div
            className="absolute right-1/2 translate-x-[0.5px] bottom-1/2 translate-y-[14px] rounded-full z-40 transition-all duration-300"
            style={{
              background: c,
              width: hovered ? "3px" : "2px",
              height: hovered ? "3px" : "2px",
              boxShadow: `0 0 6px 2px ${c}88`,
            }}
          />
        </>

        {/* Keyframes for depot card animation */}
        <style>{`
          @keyframes depotCardPopUp {
            0% { opacity: 0; transform: translateY(12px) scale(0.9); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </motion.div>
  );
};
