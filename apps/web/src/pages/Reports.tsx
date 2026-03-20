/**
 * Reports page — Container component
 *
 * ARCHITECTURE: Container/Presenter + Dependency Injection
 * Same pattern as Assets.tsx — wraps page content in DashboardPresenter
 * for the shared nav/shell.
 */
import { useDashboardLogic } from './dashboard/useDashboardLogic';
import { DashboardPresenter } from './dashboard/DashboardPresenter';
import { ReportsContainer } from './reports/ReportsContainer';

export default function Reports() {
  const dashboard = useDashboardLogic();

  return (
    <DashboardPresenter state={dashboard.state} actions={dashboard.actions}>
      <ReportsContainer />
    </DashboardPresenter>
  );
}
