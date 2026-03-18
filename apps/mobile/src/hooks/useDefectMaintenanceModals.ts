import { useCallback } from 'react';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { useModalTransition } from './useModalTransition';
import { usePersistentBackdrop } from './usePersistentBackdrop';
import { useAcceptDefect } from './useAcceptDefect';

/**
 * Builds smart defaults for a quick-accept maintenance task from a defect report context.
 * Uses the first 45 characters of description (or title if no description) as the task title suffix,
 * producing a total title of at most 50 characters (including the "Fix: " prefix).
 */
export function buildQuickAcceptDefaults(context: {
  defectId: string;
  assetId: string;
  title: string;
  description: string | null;
}): CreateMaintenanceInput {
  const truncatedNotes = context.description ? context.description.slice(0, 45) : context.title;
  return {
    assetId: context.assetId,
    title: `Fix: ${truncatedNotes}`,
    description: `Auto-created from defect report`,
    priority: 'medium',
    status: 'scheduled',
  };
}

/**
 * Shared modal state for the defect-detail -> accept-defect -> maintenance-detail chain.
 *
 * Used by home, maintenance, and assets/[id] screens. Does NOT include the standalone
 * "create maintenance" state used only by the maintenance screen.
 */
export type DefectMaintenanceModalState =
  | { type: 'none' }
  | { type: 'defectDetail'; defectId: string }
  | {
      type: 'acceptDefect';
      defectId: string;
      assetId: string;
      assetNumber: string | null;
      title: string;
      description: string | null;
    }
  | { type: 'maintenanceDetail'; maintenanceId: string };

/**
 * Encapsulates the duplicated modal chaining logic shared across
 * home, maintenance, and assets/[id] screens:
 *
 * 1. `useModalTransition` — discriminated union state machine
 * 2. `usePersistentBackdrop` — animated backdrop that persists during A->B transitions
 * 3. `useAcceptDefect` — mutation for accept-defect flow
 * 4. Four identical callbacks: handleAcceptPress, handleViewTaskPress, handleAcceptSubmit, handleDismissConfirmed
 * 5. Convenience openers: openDefectDetail, openMaintenanceDetail
 *
 * Returns everything needed by both the hook consumers and the `DefectMaintenanceModals` component.
 */
export function useDefectMaintenanceModals() {
  const { modal, closeModal, transitionTo, isTransitioning, handleExitComplete } =
    useModalTransition<DefectMaintenanceModalState>({ type: 'none' });

  const {
    backdropOpacity,
    showBackdrop,
    mounted: backdropMounted,
  } = usePersistentBackdrop(modal.type !== 'none' || isTransitioning);

  const { mutateAsync: acceptDefect } = useAcceptDefect();

  const handleAcceptPress = useCallback(
    (context: {
      defectId: string;
      assetId: string;
      assetNumber: string | null;
      title: string;
      description: string | null;
    }) => {
      transitionTo({ type: 'acceptDefect', ...context });
    },
    [transitionTo]
  );

  const handleViewTaskPress = useCallback(
    (maintenanceId: string) => {
      transitionTo({ type: 'maintenanceDetail', maintenanceId });
    },
    [transitionTo]
  );

  const handleAcceptSubmit = useCallback(
    async (input: CreateMaintenanceInput) => {
      if (modal.type !== 'acceptDefect') return;
      await acceptDefect({
        defectReportId: modal.defectId,
        maintenanceInput: input,
      });
      closeModal();
    },
    [modal, acceptDefect, closeModal]
  );

  const handleQuickAcceptPress = useCallback(
    async (context: {
      defectId: string;
      assetId: string;
      assetNumber: string | null;
      title: string;
      description: string | null;
    }) => {
      const defaults = buildQuickAcceptDefaults(context);
      await acceptDefect({
        defectReportId: context.defectId,
        maintenanceInput: defaults,
      });
      closeModal();
    },
    [acceptDefect, closeModal]
  );

  const handleDismissConfirmed = useCallback(
    (_defectId?: string) => {
      closeModal();
    },
    [closeModal]
  );

  // Convenience openers for screen-specific press handlers
  const openDefectDetail = useCallback(
    (defectId: string) => {
      transitionTo({ type: 'defectDetail', defectId });
    },
    [transitionTo]
  );

  const openMaintenanceDetail = useCallback(
    (maintenanceId: string) => {
      transitionTo({ type: 'maintenanceDetail', maintenanceId });
    },
    [transitionTo]
  );

  return {
    // State
    modal,
    isTransitioning,

    // Actions
    closeModal,
    transitionTo,
    handleExitComplete,
    handleAcceptPress,
    handleQuickAcceptPress,
    handleViewTaskPress,
    handleAcceptSubmit,
    handleDismissConfirmed,
    openDefectDetail,
    openMaintenanceDetail,

    // Backdrop
    backdropOpacity,
    showBackdrop,
    backdropMounted,
  } as const;
}

/** Return type of useDefectMaintenanceModals for typing component props. */
export type DefectMaintenanceModalsReturn = ReturnType<typeof useDefectMaintenanceModals>;
