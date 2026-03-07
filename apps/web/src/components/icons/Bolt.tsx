import { useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import type { Transition, Variants } from 'motion/react';

const transition: Transition = {
  duration: 2,
  ease: 'linear',
  repeat: 0,
};

const spinVariants: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: 360 },
};

interface BoltProps {
  width?: number;
  height?: number;
  strokeWidth?: number;
  stroke?: string;
  isHovered?: boolean;
}

const Bolt = ({
  width = 28,
  height = 28,
  strokeWidth = 2,
  stroke = '#ffffff',
  isHovered,
}: BoltProps) => {
  const controls = useAnimation();

  useEffect(() => {
    if (isHovered) {
      controls.start('animate');
    } else {
      controls.stop();
      controls.start('normal');
    }
  }, [isHovered, controls]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        <motion.g
          variants={spinVariants}
          animate={controls}
          initial="normal"
          transition={transition}
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <circle cx="12" cy="12" r="4" />
        </motion.g>
      </svg>
    </div>
  );
};

export { Bolt };
