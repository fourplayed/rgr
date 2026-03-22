/**
 * DashboardPresenter - Pure UI wrapper for Dashboard page
 *
 * ARCHITECTURE: Container/Presenter pattern
 * - Thin wrapper that fills available space within DashboardLayout's SidebarInset
 * - Navigation, fleet stats, and user controls are now handled by DashboardLayout/sidebar
 */
import { ErrorBoundary } from '@/components/ErrorBoundary';

export interface DashboardPresenterProps {
  state?: any;
  actions?: any;
  children?: React.ReactNode;
}

export function DashboardPresenter({ children }: DashboardPresenterProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}

export default DashboardPresenter;
