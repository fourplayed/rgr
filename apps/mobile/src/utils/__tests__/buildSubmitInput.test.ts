import { buildSubmitInput } from '../buildSubmitInput';
import type { StandaloneScan, CombinationScan, CombinationGroup, AssetCategory } from '@rgr/shared';

function makeStandalone(assetNumber: string, assetId?: string, category?: AssetCategory): StandaloneScan {
  return {
    type: 'standalone',
    assetId: assetId ?? `asset-${assetNumber}`,
    assetNumber,
    timestamp: Date.now(),
    ...(category && { category }),
  };
}

function makeCombinationScan(
  assetNumber: string,
  combinationId: string,
  position: number,
  assetId?: string,
  category?: AssetCategory
): CombinationScan {
  return {
    type: 'combination',
    assetId: assetId ?? `asset-${assetNumber}`,
    assetNumber,
    timestamp: Date.now(),
    combinationId,
    combinationPosition: position,
    ...(category && { category }),
  };
}

function makeComboGroup(
  combinationId: string,
  assetIds: string[],
  assetNumbers: string[],
  overrides?: Partial<CombinationGroup>
): CombinationGroup {
  return {
    combinationId,
    assetIds,
    assetNumbers,
    notes: null,
    photoUri: null,
    photoId: null,
    ...overrides,
  };
}

describe('buildSubmitInput', () => {
  const depotId = 'depot-1';
  const countedBy = 'user-1';

  it('maps standalone scans to items with null combinationId/Position', () => {
    const scans = [makeStandalone('TL001', 'a1'), makeStandalone('TL002', 'a2')];
    const result = buildSubmitInput({ depotId, countedBy, scans, combinations: {} });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      assetId: 'a1',
      combinationId: null,
      combinationPosition: null,
    });
    expect(result.items[1]).toEqual({
      assetId: 'a2',
      combinationId: null,
      combinationPosition: null,
    });
  });

  it('maps combination scans with correct combinationId and combinationPosition', () => {
    const comboId = 'combo-1';
    const scans = [
      makeCombinationScan('TL001', comboId, 1, 'a1'),
      makeCombinationScan('TL002', comboId, 2, 'a2'),
    ];
    const combinations: Record<string, CombinationGroup> = {
      [comboId]: makeComboGroup(comboId, ['a1', 'a2'], ['TL001', 'TL002']),
    };

    const result = buildSubmitInput({ depotId, countedBy, scans, combinations });

    expect(result.items[0]).toEqual({
      assetId: 'a1',
      combinationId: comboId,
      combinationPosition: 1,
    });
    expect(result.items[1]).toEqual({
      assetId: 'a2',
      combinationId: comboId,
      combinationPosition: 2,
    });
  });

  it('items.length always equals scans.length (critical count invariant)', () => {
    const comboId = 'combo-1';
    const scans = [
      makeStandalone('TL001', 'a1'),
      makeStandalone('TL002', 'a2'),
      makeCombinationScan('TL003', comboId, 1, 'a3'),
      makeCombinationScan('TL004', comboId, 2, 'a4'),
      makeStandalone('TL005', 'a5'),
    ];
    const combinations: Record<string, CombinationGroup> = {
      [comboId]: makeComboGroup(comboId, ['a3', 'a4'], ['TL003', 'TL004']),
    };

    const result = buildSubmitInput({ depotId, countedBy, scans, combinations });

    expect(result.items.length).toBe(scans.length);
  });

  it('maps combinations with notes and photoId from CombinationGroup', () => {
    const comboId = 'combo-1';
    const scans = [
      makeCombinationScan('TL001', comboId, 1, 'a1'),
      makeCombinationScan('TL002', comboId, 2, 'a2'),
    ];
    const combinations: Record<string, CombinationGroup> = {
      [comboId]: makeComboGroup(comboId, ['a1', 'a2'], ['TL001', 'TL002'], {
        notes: 'Bolted together',
        photoId: 'photo-123',
      }),
    };

    const result = buildSubmitInput({ depotId, countedBy, scans, combinations });

    expect(result.combinations).toHaveLength(1);
    expect(result.combinations[0]).toEqual({
      combinationId: comboId,
      notes: 'Bolted together',
      photoId: 'photo-123',
    });
  });

  it('returns empty combinations array when no combinations exist', () => {
    const scans = [makeStandalone('TL001'), makeStandalone('TL002')];
    const result = buildSubmitInput({ depotId, countedBy, scans, combinations: {} });

    expect(result.combinations).toEqual([]);
  });

  it('handles mixed scenario: 3 standalone + 1 combo (2 assets) → 5 items, 1 combination', () => {
    const comboId = 'combo-1';
    const scans = [
      makeStandalone('TL001', 'a1'),
      makeStandalone('TL002', 'a2'),
      makeStandalone('TL003', 'a3'),
      makeCombinationScan('TL004', comboId, 1, 'a4'),
      makeCombinationScan('TL005', comboId, 2, 'a5'),
    ];
    const combinations: Record<string, CombinationGroup> = {
      [comboId]: makeComboGroup(comboId, ['a4', 'a5'], ['TL004', 'TL005']),
    };

    const result = buildSubmitInput({ depotId, countedBy, scans, combinations });

    expect(result.items).toHaveLength(5);
    expect(result.combinations).toHaveLength(1);
    expect(result.depotId).toBe(depotId);
    expect(result.countedBy).toBe(countedBy);

    // Verify standalone items have null combo fields
    const standaloneItems = result.items.filter(i => i.combinationId === null);
    expect(standaloneItems).toHaveLength(3);

    // Verify combination items have combo fields
    const comboItems = result.items.filter(i => i.combinationId !== null);
    expect(comboItems).toHaveLength(2);
  });

  it('passes sessionNotes through when provided', () => {
    const result = buildSubmitInput({
      depotId,
      countedBy,
      scans: [makeStandalone('TL001')],
      combinations: {},
      sessionNotes: 'Count completed during rain',
    });

    expect(result.sessionNotes).toBe('Count completed during rain');
  });

  it('handles empty scans array', () => {
    const result = buildSubmitInput({ depotId, countedBy, scans: [], combinations: {} });

    expect(result.items).toEqual([]);
    expect(result.combinations).toEqual([]);
  });
});
