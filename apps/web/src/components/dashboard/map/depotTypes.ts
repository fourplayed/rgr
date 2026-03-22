import type { AssetStatus, AssetCategory } from '@rgr/shared';

/** Asset data passed to depot popup panel */
export interface DepotAsset {
  id: string;
  assetNumber: string;
  category: AssetCategory;
  status: AssetStatus;
  latitude: number;
  longitude: number;
}
