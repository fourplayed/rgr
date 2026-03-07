import { useMemo } from 'react';
import { useAssetMaintenance, useAssetScans } from './useAssetData';
import { useAssetPhotos } from './usePhotos';
import { useAssetDefectReports } from './useDefectData';
import { useDepots } from './useDepots';
import { buildAssetAssessment } from '../utils/assetAssessment';
import type { Asset, AssetWithRelations } from '@rgr/shared';
import type { MatchedDepot } from './scan/useScanActionFlow';

/**
 * Compute a natural-language assessment for an asset.
 * Fetches maintenance, photos, scans, depots, and defects in parallel,
 * then runs the pure `buildAssetAssessment` function.
 *
 * Accepts either a full `AssetWithRelations` or a plain `Asset` + `matchedDepot`.
 * Returns `null` while loading or if asset is undefined.
 */
export function useAssetAssessment(
  asset: Asset | AssetWithRelations | null | undefined,
  matchedDepot?: MatchedDepot | null
) {
  const assetId = asset?.id;

  const { data: maintenance = [] } = useAssetMaintenance(assetId);
  const { data: photos = [] } = useAssetPhotos(assetId);
  const { data: scans = [] } = useAssetScans(assetId);
  const { data: depots = [] } = useDepots();
  const { data: defectReports = [] } = useAssetDefectReports(assetId ?? null);

  return useMemo(() => {
    if (!asset) return null;

    // Build AssetWithRelations if we only have a plain Asset
    const assetWithRelations: AssetWithRelations =
      'depotName' in asset
        ? (asset as AssetWithRelations)
        : {
            ...asset,
            depotName: matchedDepot?.depot.name ?? null,
            depotCode: matchedDepot?.depot.code ?? null,
            driverName: null,
            lastScannerName: null,
            photoCount: 0,
          };

    return buildAssetAssessment({
      asset: assetWithRelations,
      maintenance,
      photos,
      scans,
      depots,
      defectReports,
    });
  }, [asset, matchedDepot, maintenance, photos, scans, depots, defectReports]);
}
