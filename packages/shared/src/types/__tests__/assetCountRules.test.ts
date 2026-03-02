import {
  canAddToCombination,
  MAX_COMBINATION_SIZE,
} from '../entities/assetCount';
import type { CombinationGroup } from '../entities/assetCount';

function makeCombo(
  size: number,
  overrides?: Partial<CombinationGroup>,
): CombinationGroup {
  return {
    combinationId: 'combo-1',
    assetIds: Array.from({ length: size }, (_, i) => `a${i + 1}`),
    assetNumbers: Array.from({ length: size }, (_, i) => `TL00${i + 1}`),
    notes: null,
    photoUri: null,
    photoId: null,
    ...overrides,
  };
}

describe('canAddToCombination', () => {
  it('returns true when combo has room (size-only check)', () => {
    const combo = makeCombo(2);
    expect(canAddToCombination(combo, 'trailer')).toBe(true);
  });

  it('returns true for same-category assets (no alternation rule)', () => {
    const combo = makeCombo(2);
    expect(canAddToCombination(combo, 'trailer')).toBe(true);
  });

  it('returns true when newCategory is undefined (no category required)', () => {
    const combo = makeCombo(2);
    expect(canAddToCombination(combo, undefined)).toBe(true);
  });

  it('returns true when combo has 4 assets (one slot left)', () => {
    const combo = makeCombo(4);
    expect(canAddToCombination(combo, 'dolly')).toBe(true);
  });

  it('returns false when combo is at max size', () => {
    const combo = makeCombo(MAX_COMBINATION_SIZE);
    expect(combo.assetIds.length).toBe(MAX_COMBINATION_SIZE);
    expect(canAddToCombination(combo, 'dolly')).toBe(false);
  });

  it('returns false when combo exceeds max size', () => {
    const combo = makeCombo(MAX_COMBINATION_SIZE + 1);
    expect(canAddToCombination(combo, 'trailer')).toBe(false);
  });
});
