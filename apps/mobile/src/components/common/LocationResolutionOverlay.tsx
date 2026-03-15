import React from 'react';
import { SteppedProgressOverlay } from './SteppedProgressOverlay';

const STEPS = ['Checking permissions', 'Acquiring GPS signal', 'Finding nearest depot'] as const;

interface LocationResolutionOverlayProps {
  visible: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  onDismiss: () => void;
  depotName: string | null;
}

/**
 * Full-screen overlay shown once per session while the initial GPS
 * resolution is in progress. Wraps SteppedProgressOverlay with
 * location-specific step labels and success messaging.
 */
export function LocationResolutionOverlay({
  visible,
  isSuccess,
  isError,
  error,
  onDismiss,
  depotName,
}: LocationResolutionOverlayProps) {
  return (
    <SteppedProgressOverlay
      visible={visible}
      isSuccess={isSuccess}
      isError={isError}
      error={error}
      onDismiss={onDismiss}
      steps={STEPS}
      title="Resolving Location"
      successMessage={depotName ? `Located at ${depotName}` : 'Location acquired'}
    />
  );
}
