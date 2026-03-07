import { memo, type ReactNode } from 'react';
import { Camera, AlertTriangle, CheckCircle, XCircle, Settings, LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * Permission states for camera access
 */
type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

/**
 * Error boundary fallback component for camera permission UI
 */
interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps): ReactNode {
  return (
    <Card padding="lg" role="alert" aria-live="assertive">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-sm text-gray-500 mb-4">
          {error?.message || 'An unexpected error occurred while loading the camera permission UI.'}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="secondary"
            aria-label="Retry loading camera permission"
          >
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
}

interface CameraPermissionProps {
  status: PermissionState;
  onRequestPermission: () => void;
  onUseFallback?: () => void;
  isLoading?: boolean;
  className?: string;
  errorDetails?: string;
}

interface StatusConfig {
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  title: string;
  description: string;
}

interface BrowserInstruction {
  browser: string;
  steps: string;
}

/**
 * Browser-specific instructions for enabling camera access
 */
const BROWSER_INSTRUCTIONS: BrowserInstruction[] = [
  {
    browser: 'iOS Safari',
    steps: 'Settings > Safari > Camera > Allow',
  },
  {
    browser: 'Chrome',
    steps: 'Click the lock icon in the address bar > Site settings > Camera > Allow',
  },
  {
    browser: 'Firefox',
    steps: 'Click the lock icon > Connection secure > More information > Permissions',
  },
];

/**
 * Configuration for each permission state
 */
const STATUS_CONFIG: Record<PermissionState, StatusConfig> = {
  granted: {
    icon: CheckCircle,
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Camera Access Granted',
    description: 'You can now scan QR codes on fleet assets.',
  },
  denied: {
    icon: XCircle,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    title: 'Camera Access Denied',
    description:
      'Camera permission was denied. To enable scanning, please allow camera access in your browser settings.',
  },
  unavailable: {
    icon: AlertTriangle,
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    title: 'Camera Not Available',
    description:
      "Your device doesn't support camera access, or the camera is being used by another application.",
  },
  prompt: {
    icon: Camera,
    iconBgColor: 'bg-primary-100',
    iconColor: 'text-primary-600',
    title: 'Camera Access Required',
    description:
      "To scan QR codes on fleet assets, we need access to your device's camera. Your camera feed is processed locally and never uploaded.",
  },
};

/**
 * Status icon component with consistent styling
 * Memoized to prevent unnecessary re-renders
 */
interface StatusIconProps {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

const StatusIcon = memo(function StatusIcon({ icon: Icon, bgColor, iconColor }: StatusIconProps) {
  return (
    <div
      className={`mx-auto w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mb-4`}
      role="img"
      aria-hidden="true"
    >
      <Icon className={`w-8 h-8 ${iconColor}`} />
    </div>
  );
});

/**
 * Browser instructions component
 * Memoized as it renders static content
 */
const BrowserInstructions = memo(function BrowserInstructions() {
  return (
    <div
      className="bg-gray-50 rounded-lg p-4 text-left mb-4"
      role="region"
      aria-label="Browser instructions"
    >
      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
        <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
        How to enable camera access:
      </h4>
      <ul className="text-sm text-gray-600 space-y-2" role="list">
        {BROWSER_INSTRUCTIONS.map(({ browser, steps }) => (
          <li key={browser} className="flex items-start">
            <span className="font-medium mr-2">{browser}:</span>
            <span>{steps}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

/**
 * HTTPS requirement notice
 * Memoized as it renders static content
 */
const HttpsNotice = memo(function HttpsNotice() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4" role="alert">
      <p className="text-sm text-yellow-800">
        <strong>Note:</strong> Camera access requires HTTPS. Make sure you're accessing this page
        via a secure connection.
      </p>
    </div>
  );
});

/**
 * Action buttons component
 */
interface ActionButtonsProps {
  status: PermissionState;
  onRequestPermission: () => void;
  onUseFallback?: () => void;
  isLoading?: boolean;
}

const ActionButtons = memo(function ActionButtons({
  status,
  onRequestPermission,
  onUseFallback,
  isLoading,
}: ActionButtonsProps) {
  const showTryAgain = status === 'denied';
  const showRequestPermission = status === 'prompt';
  const showManualEntry = status !== 'granted' && onUseFallback;

  if (status === 'granted' || (!showTryAgain && !showRequestPermission && !showManualEntry)) {
    return null;
  }

  return (
    <div
      className="flex flex-col sm:flex-row gap-3 justify-center"
      role="group"
      aria-label="Camera actions"
    >
      {showTryAgain && (
        <Button onClick={onRequestPermission} aria-label="Try camera access again">
          <Camera className="w-4 h-4 mr-2" aria-hidden="true" />
          Try Again
        </Button>
      )}
      {showRequestPermission && (
        <Button
          onClick={onRequestPermission}
          {...(isLoading !== undefined ? { isLoading } : {})}
          aria-label="Request camera access"
        >
          <Camera className="w-4 h-4 mr-2" aria-hidden="true" />
          Allow Camera Access
        </Button>
      )}
      {showManualEntry && (
        <Button
          variant="secondary"
          onClick={onUseFallback}
          aria-label="Enter code manually as alternative"
        >
          Enter Code Manually
        </Button>
      )}
    </div>
  );
});

/**
 * Camera permission request UI with instructions and fallback option
 * Optimized for iOS Safari which handles permissions differently
 *
 * Security: Follows browser security model for camera access
 * - Requires HTTPS in production
 * - User-initiated permission requests only
 * - No camera data stored or transmitted
 */
export default function CameraPermission({
  status,
  onRequestPermission,
  onUseFallback,
  isLoading = false,
  className = '',
  errorDetails,
}: CameraPermissionProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.prompt;
  const Icon = config.icon;

  return (
    <Card className={className} padding="lg" role="region" aria-label="Camera permission">
      <div className="text-center">
        <StatusIcon icon={Icon} bgColor={config.iconBgColor} iconColor={config.iconColor} />

        <h3 className="text-lg font-medium text-gray-900 mb-2" id="permission-title">
          {config.title}
        </h3>

        <p className="text-sm text-gray-500 mb-4" id="permission-description">
          {config.description}
        </p>

        {errorDetails && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left"
            role="alert"
          >
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {errorDetails}
            </p>
          </div>
        )}

        {status === 'denied' && <BrowserInstructions />}
        {status === 'unavailable' && <HttpsNotice />}

        <ActionButtons
          status={status}
          onRequestPermission={onRequestPermission}
          {...(onUseFallback ? { onUseFallback } : {})}
          isLoading={isLoading}
        />

        {status === 'prompt' && (
          <p className="text-xs text-gray-400 mt-4" role="note">
            Your browser will ask for permission. Click "Allow" to continue.
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Configuration for permission badge states
 */
interface BadgeConfig {
  icon: LucideIcon;
  text: string;
  className: string;
  ariaLabel: string;
}

const BADGE_CONFIG: Record<PermissionState, BadgeConfig> = {
  granted: {
    icon: CheckCircle,
    text: 'Camera allowed',
    className: 'bg-green-100 text-green-700',
    ariaLabel: 'Camera permission granted',
  },
  denied: {
    icon: XCircle,
    text: 'Camera denied',
    className: 'bg-red-100 text-red-700',
    ariaLabel: 'Camera permission denied',
  },
  unavailable: {
    icon: AlertTriangle,
    text: 'Camera unavailable',
    className: 'bg-yellow-100 text-yellow-700',
    ariaLabel: 'Camera unavailable',
  },
  prompt: {
    icon: Camera,
    text: 'Camera pending',
    className: 'bg-gray-100 text-gray-700',
    ariaLabel: 'Camera permission pending',
  },
};

/**
 * Compact permission status indicator
 * Displays current camera permission state as a badge
 * Memoized to prevent unnecessary re-renders
 */
export const PermissionBadge = memo(function PermissionBadge({
  status,
}: {
  status: PermissionState;
}) {
  const config = BADGE_CONFIG[status] || BADGE_CONFIG.prompt;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
      {config.text}
    </span>
  );
});

/**
 * Export types for external use
 */
export type { PermissionState, CameraPermissionProps, ErrorFallbackProps };

/**
 * Export error fallback component for use with error boundaries
 */
export { ErrorFallback as CameraPermissionErrorFallback };
