/**
 * Navigation hook - centralizes routing logic
 */
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export interface NavigationHandlers {
  navigateToAssets: () => void;
  navigateToMaintenance: () => void;
  navigateToReports: () => void;
  navigateToScanner: () => void;
  navigateToHazards: () => void;
  navigateToAssetDetail: (assetId: string) => void;
  navigateToScanDetail: (scanId: string) => void;
}

export function useNavigation(): NavigationHandlers {
  const navigate = useNavigate();

  const navigateToAssets = useCallback(() => {
    navigate('/assets');
  }, [navigate]);

  const navigateToMaintenance = useCallback(() => {
    navigate('/maintenance');
  }, [navigate]);

  const navigateToReports = useCallback(() => {
    navigate('/reports');
  }, [navigate]);

  const navigateToScanner = useCallback(() => {
    navigate('/scan');
  }, [navigate]);

  const navigateToHazards = useCallback(() => {
    navigate('/hazards');
  }, [navigate]);

  const navigateToAssetDetail = useCallback(
    (assetId: string) => {
      navigate(`/assets/${assetId}`);
    },
    [navigate]
  );

  const navigateToScanDetail = useCallback(
    (scanId: string) => {
      navigate(`/scans/${scanId}`);
    },
    [navigate]
  );

  return {
    navigateToAssets,
    navigateToMaintenance,
    navigateToReports,
    navigateToScanner,
    navigateToHazards,
    navigateToAssetDetail,
    navigateToScanDetail,
  };
}
