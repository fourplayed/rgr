/**
 * Assets page — Container component
 *
 * ARCHITECTURE: Container/Presenter + Dependency Injection
 * Same pattern as Dashboard.tsx
 */
import { useDashboardLogic } from './dashboard/useDashboardLogic';
import { DashboardPresenter } from './dashboard/DashboardPresenter';
import { useAssetsLogic } from './assets/useAssetsLogic';
import { AssetsPresenter } from './assets/AssetsPresenter';
import { useAssetsRealtime } from '@/hooks/useAssetData';

export default function Assets() {
  const dashboard = useDashboardLogic();
  const { state, actions } = useAssetsLogic();

  // Enable realtime updates
  useAssetsRealtime();

  return (
    <DashboardPresenter state={dashboard.state} actions={dashboard.actions}>
      <AssetsPresenter state={state} actions={actions} />
    </DashboardPresenter>
  );
}
