import type { AssetScan, CombinationGroup, SubmitAssetCountInput } from '@rgr/shared';
import { isStandaloneScan } from '@rgr/shared';

/**
 * Build a SubmitAssetCountInput from hook state.
 *
 * Maps confirmed scans and combination groups into the shape expected by
 * the submitAssetCount service. Extracted from scan.tsx for testability.
 */
export function buildSubmitInput(params: {
  depotId: string;
  countedBy: string;
  scans: AssetScan[];
  combinations: Record<string, CombinationGroup>;
  sessionNotes?: string | null;
}): SubmitAssetCountInput {
  const items = params.scans.map(scan => ({
    assetId: scan.assetId,
    combinationId: isStandaloneScan(scan) ? null : scan.combinationId,
    combinationPosition: isStandaloneScan(scan) ? null : scan.combinationPosition,
  }));

  const combinations = Object.values(params.combinations).map(combo => ({
    combinationId: combo.combinationId,
    notes: combo.notes,
    photoId: combo.photoId,
  }));

  return {
    depotId: params.depotId,
    countedBy: params.countedBy,
    items,
    combinations,
    ...(params.sessionNotes !== undefined && { sessionNotes: params.sessionNotes }),
  };
}
