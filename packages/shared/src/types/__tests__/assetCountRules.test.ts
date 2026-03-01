import {
  canFormNewCombination,
  canAddToCombination,
  MAX_COMBINATION_SIZE,
} from '../entities/assetCount';
import type { CombinationGroup } from '../entities/assetCount';

function makeCombo(
  assetCategories: ('trailer' | 'dolly')[],
  overrides?: Partial<CombinationGroup>,
): CombinationGroup {
  return {
    combinationId: 'combo-1',
    assetIds: assetCategories.map((_, i) => `a${i + 1}`),
    assetNumbers: assetCategories.map((c, i) => `${c === 'trailer' ? 'TL' : 'DL'}00${i + 1}`),
    notes: null,
    photoUri: null,
    photoId: null,
    assetCategories,
    ...overrides,
  };
}

describe('canFormNewCombination', () => {
  it('returns true for trailer + dolly', () => {
    expect(canFormNewCombination('trailer', 'dolly')).toBe(true);
  });

  it('returns true for dolly + trailer', () => {
    expect(canFormNewCombination('dolly', 'trailer')).toBe(true);
  });

  it('returns false for trailer + trailer', () => {
    expect(canFormNewCombination('trailer', 'trailer')).toBe(false);
  });

  it('returns false for dolly + dolly', () => {
    expect(canFormNewCombination('dolly', 'dolly')).toBe(false);
  });

  it('returns false when first category is undefined', () => {
    expect(canFormNewCombination(undefined, 'trailer')).toBe(false);
  });

  it('returns false when second category is undefined', () => {
    expect(canFormNewCombination('trailer', undefined)).toBe(false);
  });

  it('returns false when both categories are undefined', () => {
    expect(canFormNewCombination(undefined, undefined)).toBe(false);
  });
});

describe('canAddToCombination', () => {
  it('returns true when alternating and under max size', () => {
    const combo = makeCombo(['trailer', 'dolly']); // last = dolly
    expect(canAddToCombination(combo, 'trailer')).toBe(true);
  });

  it('returns true when combo has 4 assets and new category alternates', () => {
    const combo = makeCombo(['trailer', 'dolly', 'trailer', 'dolly']); // last = dolly
    expect(canAddToCombination(combo, 'trailer')).toBe(true);
  });

  it('returns false when combo is at max size', () => {
    const combo = makeCombo(['trailer', 'dolly', 'trailer', 'dolly', 'trailer']); // 5 assets
    expect(combo.assetIds.length).toBe(MAX_COMBINATION_SIZE);
    expect(canAddToCombination(combo, 'dolly')).toBe(false);
  });

  it('returns false when new category is same as last in combo', () => {
    const combo = makeCombo(['trailer', 'dolly']); // last = dolly
    expect(canAddToCombination(combo, 'dolly')).toBe(false);
  });

  it('returns false when newCategory is undefined', () => {
    const combo = makeCombo(['trailer', 'dolly']);
    expect(canAddToCombination(combo, undefined)).toBe(false);
  });

  it('returns false when combo has no assetCategories', () => {
    const combo = makeCombo([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (combo as any).assetCategories;
    combo.assetIds = ['a1', 'a2'];
    expect(canAddToCombination(combo, 'trailer')).toBe(false);
  });

  it('returns false when combo has empty assetCategories array', () => {
    const combo = makeCombo([]);
    combo.assetIds = ['a1', 'a2'];
    expect(canAddToCombination(combo, 'trailer')).toBe(false);
  });
});
