import { useEffect } from "react";
import { motion, useAnimation } from "motion/react";
import type { Variants } from "motion/react";

const pathVariants: Variants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    opacity: [0.3, 1],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

interface ActivityIconProps {
  width?: number;
  height?: number;
  strokeWidth?: number;
  stroke?: string;
  isHovered?: boolean;
}

const ActivityIcon = ({
  width = 28,
  height = 28,
  strokeWidth = 2,
  stroke = "#ffffff",
  isHovered,
}: ActivityIconProps) => {
  const controls = useAnimation();

  useEffect(() => {
    controls.start(isHovered ? "animate" : "normal");
  }, [isHovered, controls]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
          variants={pathVariants}
          animate={controls}
          initial="normal"
        />
      </svg>
    </div>
  );
};

export { ActivityIcon };
