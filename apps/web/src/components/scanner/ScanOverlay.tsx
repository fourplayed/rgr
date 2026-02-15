import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useMemo, memo, type ReactElement, type CSSProperties } from 'react';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

interface ScanOverlayProps {
  status: ScanStatus;
  message?: string;
  className?: string;
}

// =============================================================================
// CONFIGURATION
// Configuration values are intentionally defined as named constants
// to ensure maintainability and avoid scattered magic numbers
// =============================================================================

/**
 * Scan frame configuration
 */
const CONFIG = {
  /** Size of the scan frame in pixels */
  SCAN_FRAME_SIZE: 250,
  /** Size of corner brackets in pixels */
  CORNER_SIZE: 32,
  /** Size of status icons in pixels */
  ICON_SIZE: 32,
  /** Size of simple scan frame in pixels */
  SIMPLE_FRAME_SIZE: 256,
  /** Animation duration in seconds */
  ANIMATION_DURATION: 2,
} as const;

/**
 * CSS classes for status-based border colors
 * Uses Tailwind's semantic color scale
 */
const STATUS_COLORS: Record<ScanStatus, string> = {
  idle: 'border-white',
  scanning: 'border-primary-400',
  success: 'border-green-400',
  error: 'border-red-400',
};

/**
 * CSS classes for status-based background colors
 */
const BG_COLORS: Record<ScanStatus, string> = {
  idle: 'bg-transparent',
  scanning: 'bg-transparent',
  success: 'bg-green-500/20',
  error: 'bg-red-500/20',
};

/**
 * CSS classes for status message styling
 */
const MESSAGE_STYLES: Record<ScanStatus, string> = {
  idle: 'bg-black/75 text-white',
  scanning: 'bg-black/75 text-white',
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
};

/**
 * Shared animation keyframes - defined once to avoid duplication
 * Uses CSS transform for hardware-accelerated animation
 */
const SCAN_ANIMATION_STYLES = `
  @keyframes scan-sweep {
    from, to { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
  }
  .animate-scan {
    animation: scan-sweep ${CONFIG.ANIMATION_DURATION}s ease-in-out infinite;
  }
`;

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface StatusIconProps {
  status: ScanStatus;
}

/**
 * Renders status-specific icon with appropriate styling
 * Returns null for 'idle' status
 */
const StatusIcon = memo(function StatusIcon({ status }: StatusIconProps): ReactElement | null {
  const iconStyle: CSSProperties = {
    width: CONFIG.ICON_SIZE,
    height: CONFIG.ICON_SIZE,
  };

  switch (status) {
    case 'scanning':
      return <Loader2 className="text-white animate-spin" style={iconStyle} />;
    case 'success':
      return <CheckCircle className="text-green-400" style={iconStyle} />;
    case 'error':
      return <XCircle className="text-red-400" style={iconStyle} />;
    case 'idle':
    default:
      return null;
  }
});

StatusIcon.displayName = 'StatusIcon';

interface OverlayPanelProps {
  style: CSSProperties;
}

/**
 * Semi-transparent overlay panel for creating the scan frame cutout effect
 * Uses inline styles for dynamic positioning (Tailwind JIT requires static classes)
 */
const OverlayPanel = memo(function OverlayPanel({ style }: OverlayPanelProps): ReactElement {
  return (
    <div
      className="absolute bg-black/50"
      style={style}
    />
  );
});

OverlayPanel.displayName = 'OverlayPanel';

interface ScanFrameProps {
  status: ScanStatus;
}

/**
 * Animated scan frame with corner accents and status indicators
 */
const ScanFrame = memo(function ScanFrame({ status }: ScanFrameProps): ReactElement {
  const borderColor = STATUS_COLORS[status];
  const backgroundColor = BG_COLORS[status];

  const frameStyle: CSSProperties = {
    width: CONFIG.SCAN_FRAME_SIZE,
    height: CONFIG.SCAN_FRAME_SIZE,
  };

  return (
    <div
      className={`relative rounded-lg border-2 transition-all duration-300 ${borderColor} ${backgroundColor}`}
      style={frameStyle}
    >
      <FrameCorners borderColor={borderColor} />
      {status === 'scanning' && <ScanningLine />}
      {(status === 'success' || status === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center">
          <StatusIcon status={status} />
        </div>
      )}
    </div>
  );
});

ScanFrame.displayName = 'ScanFrame';

interface FrameCornersProps {
  borderColor: string;
}

/**
 * Decorative corner brackets for the scan frame
 */
const FrameCorners = memo(function FrameCorners({ borderColor }: FrameCornersProps): ReactElement {
  const cornerStyle: CSSProperties = {
    width: CONFIG.CORNER_SIZE,
    height: CONFIG.CORNER_SIZE,
  };

  const baseClasses = `absolute border-4 ${borderColor}`;

  return (
    <>
      <div
        className={`${baseClasses} top-0 left-0 border-t border-l rounded-tl-lg`}
        style={cornerStyle}
      />
      <div
        className={`${baseClasses} top-0 right-0 border-t border-r rounded-tr-lg`}
        style={cornerStyle}
      />
      <div
        className={`${baseClasses} bottom-0 left-0 border-b border-l rounded-bl-lg`}
        style={cornerStyle}
      />
      <div
        className={`${baseClasses} bottom-0 right-0 border-b border-r rounded-br-lg`}
        style={cornerStyle}
      />
    </>
  );
});

FrameCorners.displayName = 'FrameCorners';

/**
 * Animated scanning line that sweeps across the frame
 */
const ScanningLine = memo(function ScanningLine(): ReactElement {
  return (
    <div className="absolute inset-x-4 h-0.5 bg-primary-400 animate-pulse top-1/2 -translate-y-1/2">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-300 to-transparent animate-scan" />
    </div>
  );
});

ScanningLine.displayName = 'ScanningLine';

interface StatusMessageProps {
  status: ScanStatus;
  message: string;
}

/**
 * Status message displayed at the bottom of the overlay
 */
const StatusMessage = memo(function StatusMessage({ status, message }: StatusMessageProps): ReactElement {
  const messageStyle = MESSAGE_STYLES[status];

  return (
    <div className="absolute bottom-4 inset-x-4">
      <div className={`text-center py-2 px-4 rounded-lg text-sm font-medium ${messageStyle}`}>
        {message}
      </div>
    </div>
  );
});

StatusMessage.displayName = 'StatusMessage';

// =============================================================================
// OVERLAY PANEL STYLES
// =============================================================================

interface PanelDimensions {
  topPanel: CSSProperties;
  bottomPanel: CSSProperties;
  leftPanel: CSSProperties;
  rightPanel: CSSProperties;
}

/**
 * Calculate overlay panel dimensions based on frame size
 * Returns inline styles for each panel to create the cutout effect
 */
function calculatePanelDimensions(): PanelDimensions {
  const offset = CONFIG.SCAN_FRAME_SIZE / 2;
  const verticalHeight = `calc(50% - ${offset}px)`;
  const horizontalWidth = `calc(50% - ${offset}px)`;

  return {
    topPanel: {
      top: 0,
      left: 0,
      right: 0,
      height: verticalHeight,
    },
    bottomPanel: {
      bottom: 0,
      left: 0,
      right: 0,
      height: verticalHeight,
    },
    leftPanel: {
      top: verticalHeight,
      left: 0,
      width: horizontalWidth,
      height: CONFIG.SCAN_FRAME_SIZE,
    },
    rightPanel: {
      top: verticalHeight,
      right: 0,
      width: horizontalWidth,
      height: CONFIG.SCAN_FRAME_SIZE,
    },
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Visual overlay for QR scanner with scan frame and status indicators
 *
 * Displays a centered scan frame with corner accents, status animations,
 * and optional status messages. Optimized for performance with memoization.
 *
 * @param status - Current scan status ('idle', 'scanning', 'success', 'error')
 * @param message - Optional status message to display
 * @param className - Additional CSS classes for the container
 */
export default function ScanOverlay({ status, message, className = '' }: ScanOverlayProps): ReactElement {
  const panelDimensions = useMemo(calculatePanelDimensions, []);

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <OverlayPanel style={panelDimensions.topPanel} />
        <OverlayPanel style={panelDimensions.bottomPanel} />
        <OverlayPanel style={panelDimensions.leftPanel} />
        <OverlayPanel style={panelDimensions.rightPanel} />
        <ScanFrame status={status} />
      </div>

      {message && <StatusMessage status={status} message={message} />}

      <style>{SCAN_ANIMATION_STYLES}</style>
    </div>
  );
}

// =============================================================================
// SIMPLIFIED SCAN FRAME
// =============================================================================

interface SimpleScanFrameProps {
  className?: string;
}

/**
 * Simplified scan frame component for standalone use
 *
 * Displays just the scan frame with corner brackets and scanning animation,
 * without the full overlay system.
 */
export const SimpleScanFrame = memo(function SimpleScanFrame({ className = '' }: SimpleScanFrameProps): ReactElement {
  const frameStyle: CSSProperties = {
    width: CONFIG.SIMPLE_FRAME_SIZE,
    height: CONFIG.SIMPLE_FRAME_SIZE,
  };

  const cornerStyle: CSSProperties = {
    width: CONFIG.CORNER_SIZE,
    height: CONFIG.CORNER_SIZE,
  };

  return (
    <div className={`relative ${className}`} style={frameStyle}>
      <div
        className="absolute top-0 left-0 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"
        style={cornerStyle}
      />
      <div
        className="absolute top-0 right-0 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"
        style={cornerStyle}
      />
      <div
        className="absolute bottom-0 left-0 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"
        style={cornerStyle}
      />
      <div
        className="absolute bottom-0 right-0 border-b-4 border-r-4 border-primary-500 rounded-br-lg"
        style={cornerStyle}
      />

      <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-primary-400/75">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-300 to-transparent animate-scan" />
      </div>

      <style>{SCAN_ANIMATION_STYLES}</style>
    </div>
  );
});

SimpleScanFrame.displayName = 'SimpleScanFrame';
