import React from 'react';
import { PersistentBackdrop } from './PersistentBackdrop';
import {
  DefectReportDetailModal,
  CreateMaintenanceModal,
  MaintenanceDetailModal,
} from '../maintenance';
import type { DefectMaintenanceModalsReturn } from '../../hooks/useDefectMaintenanceModals';

interface DefectMaintenanceModalsProps extends DefectMaintenanceModalsReturn {
  /** Passed through to DefectReportDetailModal and MaintenanceDetailModal.
   *  Default 'full'. */
  variant?: 'full' | 'compact';
  /** Whether to render the PersistentBackdrop. Default true.
   *  Set to false when the consuming screen has its own backdrop (e.g. scan). */
  renderBackdrop?: boolean;
}

/**
 * Renders the persistent backdrop + 3 chained modals (defect detail, accept/create
 * maintenance, maintenance detail) used by home, maintenance, and assets/[id] screens.
 *
 * Accepts the full return value of `useDefectMaintenanceModals()` spread as props,
 * plus an optional `variant` prop.
 */
export function DefectMaintenanceModals({
  modal,
  closeModal,
  handleExitComplete,
  handleAcceptPress,
  handleViewTaskPress,
  handleAcceptSubmit,
  handleDismissConfirmed,
  backdropOpacity,
  showBackdrop,
  backdropMounted,
  variant,
  renderBackdrop = true,
}: DefectMaintenanceModalsProps) {
  return (
    <>
      {/* Persistent backdrop — stays visible during A->B modal transitions */}
      {renderBackdrop && (
        <PersistentBackdrop
          opacity={backdropOpacity}
          showBackdrop={showBackdrop}
          mounted={backdropMounted}
          onPress={closeModal}
        />
      )}

      {/* Chained modals — gorhom portal rendering (no wrapper needed) */}
      <DefectReportDetailModal
        visible={modal.type === 'defectDetail'}
        defectId={modal.type === 'defectDetail' ? modal.defectId : null}
        onClose={closeModal}
        onAcceptPress={handleAcceptPress}
        onViewTaskPress={handleViewTaskPress}
        onDismissConfirmed={handleDismissConfirmed}
        noBackdrop
        onExitComplete={handleExitComplete}
        {...(variant ? { variant } : {})}
      />

      <CreateMaintenanceModal
        visible={modal.type === 'acceptDefect'}
        onClose={closeModal}
        noBackdrop
        onExitComplete={handleExitComplete}
        {...(modal.type === 'acceptDefect'
          ? {
              assetId: modal.assetId,
              ...(modal.assetNumber != null ? { assetNumber: modal.assetNumber } : {}),
              defectReportId: modal.defectId,
              defaultTitle: modal.description ?? modal.title,
              defaultPriority: 'medium' as const,
              onExternalSubmit: handleAcceptSubmit,
            }
          : {})}
      />

      <MaintenanceDetailModal
        visible={modal.type === 'maintenanceDetail'}
        maintenanceId={modal.type === 'maintenanceDetail' ? modal.maintenanceId : null}
        onClose={closeModal}
        noBackdrop
        onExitComplete={handleExitComplete}
        {...(variant ? { variant } : {})}
      />
    </>
  );
}
