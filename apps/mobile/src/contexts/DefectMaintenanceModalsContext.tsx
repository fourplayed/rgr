import { createContext, useContext, type ReactNode } from 'react';
import {
  useDefectMaintenanceModals,
  type DefectMaintenanceModalsReturn,
} from '../hooks/useDefectMaintenanceModals';
import { DefectMaintenanceModals } from '../components/common/DefectMaintenanceModals';

const DefectMaintenanceModalsContext = createContext<DefectMaintenanceModalsReturn | null>(null);

/**
 * Provides a single shared instance of the defect/maintenance modal chain
 * across all tab screens. Renders the `DefectMaintenanceModals` component once
 * at the layout level (gorhom portals render above all screens regardless).
 */
export function DefectMaintenanceModalsProvider({ children }: { children: ReactNode }) {
  const modals = useDefectMaintenanceModals();

  return (
    <DefectMaintenanceModalsContext.Provider value={modals}>
      {children}
      <DefectMaintenanceModals {...modals} />
    </DefectMaintenanceModalsContext.Provider>
  );
}

/**
 * Read the shared defect/maintenance modal state from the nearest provider.
 * Must be used within `DefectMaintenanceModalsProvider`.
 */
export function useDefectMaintenanceModalsContext(): DefectMaintenanceModalsReturn {
  const context = useContext(DefectMaintenanceModalsContext);
  if (!context) {
    throw new Error(
      'useDefectMaintenanceModalsContext must be used within DefectMaintenanceModalsProvider'
    );
  }
  return context;
}
