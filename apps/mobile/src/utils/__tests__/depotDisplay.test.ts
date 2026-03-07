import { sortDepotsByOrder, getDepotColor, DEPOT_ORDER } from '../depotDisplay';
import type { Depot } from '@rgr/shared';

const makeDepot = (code: string, overrides?: Partial<Depot>): Depot => ({
  id: `depot-${code}`,
  name: `${code.toUpperCase()} Depot`,
  code: code.toUpperCase(),
  address: null,
  latitude: -31.95,
  longitude: 115.86,
  color: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('sortDepotsByOrder', () => {
  it('sorts depots according to DEPOT_ORDER', () => {
    const depots = [
      makeDepot('WUB'),
      makeDepot('PER'),
      makeDepot('KAR'),
    ];
    const sorted = sortDepotsByOrder(depots);
    expect(sorted.map(d => d.code)).toEqual(['PER', 'KAR', 'WUB']);
  });

  it('puts unknown depots at the end', () => {
    const depots = [
      makeDepot('ZZZ'),
      makeDepot('PER'),
    ];
    const sorted = sortDepotsByOrder(depots);
    expect(sorted.map(d => d.code)).toEqual(['PER', 'ZZZ']);
  });

  it('does not mutate the original array', () => {
    const depots = [makeDepot('KAR'), makeDepot('PER')];
    const original = [...depots];
    sortDepotsByOrder(depots);
    expect(depots).toEqual(original);
  });
});

describe('getDepotColor', () => {
  it('returns the depot color when set', () => {
    const depot = makeDepot('PER', { color: '#FF0000' });
    expect(getDepotColor(depot)).toBe('#FF0000');
  });

  it('returns fallback color when depot color is undefined', () => {
    const depot = makeDepot('PER');
    expect(getDepotColor(depot)).toBe('#00A8FF');
  });
});

describe('DEPOT_ORDER', () => {
  it('contains expected depot codes', () => {
    expect(DEPOT_ORDER).toContain('per');
    expect(DEPOT_ORDER.length).toBeGreaterThan(0);
  });
});
