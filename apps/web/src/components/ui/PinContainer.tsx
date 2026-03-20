"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const PinContainer = ({
  children,
  title,
  href,
  className,
  containerClassName,
  color,
}: {
  children?: React.ReactNode;
  title?: string;
  href?: string;
  className?: string;
  containerClassName?: string;
  /** Accent color for the stem, dot, and rings (CSS color name or value) */
  color?: string;
}) => {
  const [hovered, setHovered] = useState(false);

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
      <PinPerspective title={title} href={href} color={color} hovered={hovered} setHovered={setHovered} />
    </div>
  );
};

export const PinPerspective = ({
  title,
  href,
  color,
  hovered,
  setHovered,
}: {
  title?: string | undefined;
  href?: string | undefined;
  color?: string | undefined;
  hovered: boolean;
  setHovered: (v: boolean) => void;
}) => {
  const c = color || "cyan";
  const isCyan = !color || color === "cyan";

  const ringBg = isCyan ? "rgba(14, 165, 233, 0.08)" : `${c}14`;
  const stemGradient = isCyan
    ? "linear-gradient(to bottom, transparent, rgb(6, 182, 212))"
    : `linear-gradient(to bottom, transparent, ${c})`;

  return (
    <motion.div className="pointer-events-none w-96 h-80 flex items-center justify-center z-[60]">
      <div className="w-full h-full -mt-7 flex-none inset-0">
        {/* Label pill */}
        <div
          className="absolute inset-x-0 flex justify-center z-10 transition-all duration-500 ease-out"
          style={{ bottom: "50%", marginBottom: "30px" }}
        >
          <span
            className={cn(
              "text-white text-sm font-bold py-0.5 px-3 rounded-full ring-1 ring-white/10 whitespace-nowrap transition-all duration-500",
              hovered && "-translate-y-16"
            )}
            style={{ backgroundColor: `${c}d0`, textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.4)" }}
          >
            {title}
          </span>
        </div>

        {/* Invisible 120px dome — sole hover target */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="absolute left-1/2 bottom-1/2 rounded-full pointer-events-auto cursor-pointer"
          style={{
            zIndex: 51,
            width: "120px",
            height: "120px",
            transform: "translate(-50%, 50%)",
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
          <motion.div
            className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 translate-y-[14px] rounded-full z-40 blur-[3px] transition-all duration-300"
            style={{
              background: c,
              width: hovered ? "6px" : "4px",
              height: hovered ? "6px" : "4px",
            }}
          />
          <motion.div
            className="absolute right-1/2 translate-x-[0.5px] bottom-1/2 translate-y-[14px] rounded-full z-40 transition-all duration-300"
            style={{
              background: c,
              width: hovered ? "3px" : "2px",
              height: hovered ? "3px" : "2px",
            }}
          />
        </>
      </div>
    </motion.div>
  );
};
