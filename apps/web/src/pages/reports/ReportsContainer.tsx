/**
 * ReportsContainer — wires useReportsLogic into ReportsPresenter
 *
 * ARCHITECTURE: Container/Presenter pattern
 * - Calls useReportsLogic() to get all data and handlers
 * - Passes them down as props — no UI logic here
 */
import { useCallback } from 'react';
import { useReportsLogic } from './useReportsLogic';
import { ReportsPresenter } from './ReportsPresenter';

export function ReportsContainer() {
  const logic = useReportsLogic();

  // Bind handleExportCsv to the current outstanding assets so the presenter
  // can call onExportCsv() without needing to pass data back up.
  const handleExportCsv = useCallback(() => {
    logic.handleExportCsv(logic.outstandingAssets);
  }, [logic.handleExportCsv, logic.outstandingAssets]);

  return (
    <ReportsPresenter
      timeRange={logic.timeRange}
      onTimeRangeChange={logic.setTimeRange}
      scanFrequency={logic.scanFrequency}
      scanFrequencyLoading={logic.scanFrequencyLoading}
      assetUtilization={logic.assetUtilization}
      assetUtilizationLoading={logic.assetUtilizationLoading}
      hazardTrends={logic.hazardTrends}
      hazardTrendsLoading={logic.hazardTrendsLoading}
      timeBetweenScans={logic.timeBetweenScans}
      timeBetweenScansLoading={logic.timeBetweenScansLoading}
      outstandingAssets={logic.outstandingAssets}
      outstandingAssetsLoading={logic.outstandingAssetsLoading}
      onExportCsv={handleExportCsv}
    />
  );
}

export default ReportsContainer;
