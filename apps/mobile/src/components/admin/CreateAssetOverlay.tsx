import React from 'react';
import { SteppedProgressOverlay } from '../common/SteppedProgressOverlay';

const STEPS = [
  'Validating details',
  'Creating asset record',
  'Generating QR code',
  'Finalising',
] as const;

interface CreateAssetOverlayProps {
  visible: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  onDismiss: () => void;
}

export function CreateAssetOverlay(props: CreateAssetOverlayProps) {
  return (
    <SteppedProgressOverlay
      {...props}
      steps={STEPS}
      title="Creating Asset"
      successMessage="Asset Created"
    />
  );
}
