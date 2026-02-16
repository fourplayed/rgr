import { useEffect } from "react";
import { motion, useAnimation } from "motion/react";
import type { Variants } from "motion/react";

const frameVariants: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 1 },
};

const lineVariants: Variants = {
  visible: { pathLength: 1, opacity: 1 },
  hidden: { pathLength: 0, opacity: 0 },
};

interface ChartColumnProps {
  width?: number;
  height?: number;
  strokeWidth?: number;
  stroke?: string;
  isHovered?: boolean;
}

const ChartColumn = ({
  width = 28,
  height = 28,
  strokeWidth = 2,
  stroke = "#ffffff",
  isHovered,
}: ChartColumnProps) => {
  const controls = useAnimation();

  useEffect(() => {
    if (isHovered) {
      (async () => {
        await controls.start((i) => ({
          pathLength: 0,
          opacity: 0,
          transition: { delay: i * 0.1, duration: 0.3 },
        }));
        await controls.start((i) => ({
          pathLength: 1,
          opacity: 1,
          transition: { delay: i * 0.1, duration: 0.3 },
        }));
      })();
    } else {
      controls.start("visible");
    }
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
        <motion.path variants={lineVariants} initial="visible" animate={controls} custom={1} d="M13 17V9" />
        <motion.path variants={lineVariants} initial="visible" animate={controls} custom={2} d="M18 17V5" />
        <motion.path variants={frameVariants} d="M3 3v16a2 2 0 0 0 2 2h16" />
        <motion.path variants={lineVariants} initial="visible" animate={controls} custom={0} d="M8 17v-3" />
      </svg>
    </div>
  );
};

export { ChartColumn };
