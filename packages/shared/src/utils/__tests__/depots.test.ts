import type { Depot } from '../../types';
import {
  buildDepotLookups,
  getDepotColorByCode,
  findDepotByLocationString,
  getDepotBadgeColors,
} from '../depots';

function makeDepot(overrides: Partial<Depot> = {}): Depot {
  return {
    id: 'depot-1',
    name: 'Perth Depot',
    code: 'PER',
    address: null,
    latitude: null,
    longitude: null,
    color: '#FF0000',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const depots: Depot[] = [
  makeDepot({ id: 'd1', name: 'Perth Depot', code: 'PER', color: '#FF0000' }),
  makeDepot({ id: 'd2', name: 'Sydney Depot', code: 'SYD', color: '#0000FF' }),
  makeDepot({ id: 'd3', name: 'Melbourne Depot', code: 'MEL', color: '#FFFF00' }),
];

describe('buildDepotLookups', () => {
  it('builds byCode and byName maps', () => {
    const { byCode, byName } = buildDepotLookups(depots);

    expect(byCode.size).toBe(3);
    expect(byName.size).toBe(3);
    expect(byCode.get('per')?.id).toBe('d1');
    expect(byName.get('sydney depot')?.id).toBe('d2');
  });

  it('performs case-insensitive lookup', () => {
    const { byCode, byName } = buildDepotLookups(depots);

    expect(byCode.get('per')?.code).toBe('PER');
    expect(byName.get('perth depot')?.code).toBe('PER');
  });

  it('returns empty maps for empty input', () => {
    const { byCode, byName } = buildDepotLookups([]);

    expect(byCode.size).toBe(0);
    expect(byName.size).toBe(0);
  });
});

describe('getDepotColorByCode', () => {
  it('returns color for a matching code', () => {
    expect(getDepotColorByCode(depots, 'PER')).toBe('#FF0000');
  });

  it('returns color case-insensitively', () => {
    expect(getDepotColorByCode(depots, 'per')).toBe('#FF0000');
    expect(getDepotColorByCode(depots, 'SyD')).toBe('#0000FF');
  });

  it('returns default fallback for unknown code', () => {
    expect(getDepotColorByCode(depots, 'XXX')).toBe('#9ca3af');
  });

  it('returns custom fallback for unknown code', () => {
    expect(getDepotColorByCode(depots, 'XXX', '#000000')).toBe('#000000');
  });
});

describe('findDepotByLocationString', () => {
  it('finds a depot by name in location description', () => {
    const result = findDepotByLocationString('Located near Perth Depot yard', depots);
    expect(result?.id).toBe('d1');
  });

  it('matches case-insensitively', () => {
    const result = findDepotByLocationString('at the sydney depot', depots);
    expect(result?.id).toBe('d2');
  });

  it('returns null when no match', () => {
    const result = findDepotByLocationString('Unknown location', depots);
    expect(result).toBeNull();
  });
});

describe('getDepotBadgeColors', () => {
  it('returns fallback colors for null depot', () => {
    const result = getDepotBadgeColors(null);
    expect(result).toEqual({ bg: '#E8E8E8', text: '#1E293B' });
  });

  it('returns fallback colors for depot with no color', () => {
    const depot = makeDepot({ color: null });
    const result = getDepotBadgeColors(depot);
    expect(result).toEqual({ bg: '#E8E8E8', text: '#1E293B' });
  });

  it('returns dark text for light background color', () => {
    // #FFFF00 (yellow) is a light color
    const depot = makeDepot({ color: '#FFFF00' });
    const result = getDepotBadgeColors(depot);
    expect(result).toEqual({ bg: '#FFFF00', text: '#1E293B' });
  });

  it('returns white text for dark background color', () => {
    // #0000FF (blue) is a dark color
    const depot = makeDepot({ color: '#0000FF' });
    const result = getDepotBadgeColors(depot);
    expect(result).toEqual({ bg: '#0000FF', text: '#FFFFFF' });
  });

  it('uses custom fallback colors', () => {
    const result = getDepotBadgeColors(null, '#111111', '#EEEEEE');
    expect(result).toEqual({ bg: '#111111', text: '#EEEEEE' });
  });
});
