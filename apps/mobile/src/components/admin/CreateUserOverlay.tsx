import React from 'react';
import { SteppedProgressOverlay } from '../common/SteppedProgressOverlay';

const STEPS = [
  'Validating details',
  'Creating account',
  'Setting up profile',
  'Assigning role & depot',
  'Finalising',
] as const;

interface CreateUserOverlayProps {
  visible: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  onDismiss: () => void;
}

export function CreateUserOverlay(props: CreateUserOverlayProps) {
  return (
    <SteppedProgressOverlay
      {...props}
      steps={STEPS}
      title="Creating User"
      successMessage="User Created"
    />
  );
}
