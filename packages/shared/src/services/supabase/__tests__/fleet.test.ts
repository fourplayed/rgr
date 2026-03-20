import {
  getHazardClearanceRate,
  getDepotHealthScores,
} from '../fleet';

// ── Mock client ──

const mockClient = {
  from: jest.fn(),
};

jest.mock('../client', () => ({
  getSupabaseClient: () => mockClient,
}));

// ── Chain builder ──
// Builds a fluent mock chain where the last call in the chain resolves to `value`.
// Every intermediate method returns `chain` so any ordering of calls works.
// The final `await` is intercepted by making chain thenable.
function buildChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};

  // Make the chain thenable so `await chain` resolves to resolvedValue
  chain.then = (
    onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolvedValue).then(onFulfilled, onRejected);

  // All builder methods return chain (tracked as jest.fn for assertions)
  chain.select = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  chain.lt = jest.fn(() => chain);
  chain.lte = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.or = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.not = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);

  return chain as Record<string, jest.Mock>;
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ── getHazardClearanceRate ──

describe('getHazardClearanceRate', () => {
  it('returns 100 when there are no hazard alerts (all clear)', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardClearanceRate();

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBe(100);
  });

  it('calculates clearance rate correctly (cleared = acknowledged + resolved + dismissed)', async () => {
    const rows = [
      { status: 'active' },
      { status: 'acknowledged' },
      { status: 'resolved' },
      { status: 'dismissed' },
    ];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardClearanceRate();

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    // 3 cleared out of 4 total = 75%
    expect(result.data).toBe(75);
  });

  it('returns 0 when all alerts are active (none cleared)', async () => {
    const rows = [{ status: 'active' }, { status: 'active' }, { status: 'active' }];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardClearanceRate();

    expect(result.success).toBe(true);
    expect(result.data).toBe(0);
  });

  it('returns 100 when all alerts are cleared', async () => {
    const rows = [{ status: 'resolved' }, { status: 'acknowledged' }, { status: 'dismissed' }];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardClearanceRate();

    expect(result.success).toBe(true);
    expect(result.data).toBe(100);
  });

  it('rounds to 1 decimal place', async () => {
    // 1 cleared out of 3 = 33.333... → 33.3
    const rows = [{ status: 'resolved' }, { status: 'active' }, { status: 'active' }];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardClearanceRate();

    expect(result.success).toBe(true);
    expect(result.data).toBe(33.3);
  });

  it('returns error result when query fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'DB error' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardClearanceRate();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('DB error');
  });

  it('queries hazard_alerts table selecting status column', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getHazardClearanceRate();

    expect(mockClient.from).toHaveBeenCalledWith('hazard_alerts');
    expect(chain.select).toHaveBeenCalledWith('status');
  });
});

// ── getDepotHealthScores ──

describe('getDepotHealthScores', () => {
  // Minimal depot rows returned from the depots query
  const depotRows = [
    { id: 'depot-1', name: 'Depot Alpha', code: 'DA', address: null, latitude: null, longitude: null, color: null, is_active: true, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
    { id: 'depot-2', name: 'Depot Beta', code: 'DB', address: null, latitude: null, longitude: null, color: null, is_active: true, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
  ];

  it('returns error when depot fetch fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'Connection refused' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getDepotHealthScores();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Connection refused');
  });

  it('returns empty array when no depots exist', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getDepotHealthScores();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns a DepotHealthScoreData entry per depot with correct shape', async () => {
    // Call sequence:
    //   1. depots query (returns depotRows)
    //   2. assets query for depot-1 (scanCompliance)
    //   3. hazard_alerts query for depot-1 (hazardClearance)
    //   4. maintenance_records query for depot-1 (maintenanceCurrency)
    //   5. assets query for depot-2
    //   (depot-2 has 0 assets → hazard/maintenance queries skipped, scores default to 100)

    // All depots query result
    const depotsChain = buildChain({ data: depotRows, error: null });

    // depot-1: assets = 10, 7 scanned in 30d → scanCompliance = 70
    const assets1Chain = buildChain({
      data: [
        { id: 'a1', last_location_updated_at: new Date(Date.now() - 5 * 86400000).toISOString() },
        { id: 'a2', last_location_updated_at: new Date(Date.now() - 10 * 86400000).toISOString() },
        { id: 'a3', last_location_updated_at: new Date(Date.now() - 15 * 86400000).toISOString() },
        { id: 'a4', last_location_updated_at: new Date(Date.now() - 20 * 86400000).toISOString() },
        { id: 'a5', last_location_updated_at: new Date(Date.now() - 25 * 86400000).toISOString() },
        { id: 'a6', last_location_updated_at: new Date(Date.now() - 28 * 86400000).toISOString() },
        { id: 'a7', last_location_updated_at: new Date(Date.now() - 29 * 86400000).toISOString() },
        { id: 'a8', last_location_updated_at: new Date(Date.now() - 35 * 86400000).toISOString() }, // outside 30d
        { id: 'a9', last_location_updated_at: null }, // never scanned
        { id: 'a10', last_location_updated_at: null }, // never scanned
      ],
      error: null,
    });

    // depot-1: hazard_alerts = 4, 3 cleared → hazardClearance = 75
    const hazards1Chain = buildChain({
      data: [
        { status: 'acknowledged' },
        { status: 'resolved' },
        { status: 'dismissed' },
        { status: 'active' },
      ],
      error: null,
    });

    // depot-1: maintenance_records = 5, 1 overdue (scheduled + due_date past) → 4 current → maintenanceCurrency = 80
    const maint1Chain = buildChain({
      data: [
        { id: 'm1', status: 'scheduled', due_date: '2020-01-01' }, // overdue
        { id: 'm2', status: 'scheduled', due_date: '2030-01-01' }, // not overdue
        { id: 'm3', status: 'in_progress', due_date: '2020-01-01' }, // not scheduled
        { id: 'm4', status: 'completed', due_date: '2020-01-01' }, // not scheduled
        { id: 'm5', status: 'cancelled', due_date: '2020-01-01' }, // not scheduled
      ],
      error: null,
    });

    // depot-2: 0 assets → scanCompliance = 100, hazardClearance = 100, maintenanceCurrency = 100
    // No hazard/maintenance queries issued for depot-2 (zero assets branch skips them)
    const assets2Chain = buildChain({ data: [], error: null });

    mockClient.from
      .mockReturnValueOnce(depotsChain)    // 1. depots
      .mockReturnValueOnce(assets1Chain)   // 2. assets for depot-1
      .mockReturnValueOnce(hazards1Chain)  // 3. hazards for depot-1
      .mockReturnValueOnce(maint1Chain)    // 4. maintenance for depot-1
      .mockReturnValueOnce(assets2Chain);  // 5. assets for depot-2

    const result = await getDepotHealthScores();

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const scores = result.data!;
    expect(scores).toHaveLength(2);

    const depot1 = scores.find((s) => s.depotId === 'depot-1')!;
    expect(depot1).toBeDefined();
    expect(depot1.depotName).toBe('Depot Alpha');
    expect(depot1.scanCompliance).toBe(70);
    expect(depot1.hazardClearance).toBe(75);
    expect(depot1.maintenanceCurrency).toBe(80);
    // overallScore = 70*0.4 + 75*0.4 + 80*0.2 = 28 + 30 + 16 = 74
    expect(depot1.overallScore).toBe(74);

    const depot2 = scores.find((s) => s.depotId === 'depot-2')!;
    expect(depot2).toBeDefined();
    expect(depot2.depotName).toBe('Depot Beta');
    expect(depot2.scanCompliance).toBe(100);
    expect(depot2.hazardClearance).toBe(100);
    expect(depot2.maintenanceCurrency).toBe(100);
    expect(depot2.overallScore).toBe(100);
  });

  it('returns error when assets query fails for a depot', async () => {
    const depotsChain = buildChain({ data: [depotRows[0]], error: null });
    const assetsErrorChain = buildChain({ data: null, error: { message: 'Assets query failed' } });

    mockClient.from
      .mockReturnValueOnce(depotsChain)
      .mockReturnValueOnce(assetsErrorChain);

    const result = await getDepotHealthScores();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Assets query failed');
  });

  it('returns error when hazard_alerts query fails for a depot', async () => {
    // Hazard query is only issued when the depot has assets (depotAssetIds.length > 0)
    const depotsChain = buildChain({ data: [depotRows[0]], error: null });
    const assetsChain = buildChain({
      data: [{ id: 'a1', last_location_updated_at: null }],
      error: null,
    });
    const hazardsErrorChain = buildChain({ data: null, error: { message: 'Hazard query failed' } });

    mockClient.from
      .mockReturnValueOnce(depotsChain)
      .mockReturnValueOnce(assetsChain)
      .mockReturnValueOnce(hazardsErrorChain);

    const result = await getDepotHealthScores();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Hazard query failed');
  });

  it('returns error when maintenance_records query fails for a depot', async () => {
    // Maintenance query is only issued when the depot has assets (depotAssetIds.length > 0)
    const depotsChain = buildChain({ data: [depotRows[0]], error: null });
    const assetsChain = buildChain({
      data: [{ id: 'a1', last_location_updated_at: null }],
      error: null,
    });
    const hazardsChain = buildChain({ data: [], error: null });
    const maintErrorChain = buildChain({ data: null, error: { message: 'Maintenance query failed' } });

    mockClient.from
      .mockReturnValueOnce(depotsChain)
      .mockReturnValueOnce(assetsChain)
      .mockReturnValueOnce(hazardsChain)
      .mockReturnValueOnce(maintErrorChain);

    const result = await getDepotHealthScores();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Maintenance query failed');
  });

  it('queries depots table first', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getDepotHealthScores();

    expect(mockClient.from).toHaveBeenCalledWith('depots');
  });
});
