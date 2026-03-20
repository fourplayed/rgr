import {
  getScanFrequency,
  getAssetUtilization,
  getHazardTrends,
  getTimeBetweenScans,
  getOutstandingAnalyticsAssets,
} from '../analytics';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChain(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};

  // Make the chain thenable so `await chain` resolves to resolvedValue
  chain.then = (
    onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolvedValue).then(onFulfilled, onRejected);

  // All builder methods return chain (tracked as jest.fn for assertions)
  chain.select = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.or = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.not = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);

  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getScanFrequency ──

describe('getScanFrequency', () => {
  it('returns aggregated scan frequency points for 7d range', async () => {
    const rows = [
      { created_at: '2026-03-19T10:00:00.000Z' },
      { created_at: '2026-03-19T14:00:00.000Z' },
      { created_at: '2026-03-20T09:00:00.000Z' },
    ];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getScanFrequency('7d');

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const data = result.data!;
    const march19 = data.find((p) => p.date === '2026-03-19');
    const march20 = data.find((p) => p.date === '2026-03-20');
    expect(march19?.count).toBe(2);
    expect(march20?.count).toBe(1);
    // Sorted ascending by date
    if (data.length >= 2) {
      expect(data[0]!.date <= data[data.length - 1]!.date).toBe(true);
    }
  });

  it('returns empty array when no scans in range', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getScanFrequency('30d');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns error result when query fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'DB error' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getScanFrequency('7d');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('DB error');
  });

  it('queries scan_events table with gte filter on created_at', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getScanFrequency('7d');

    expect(mockClient.from).toHaveBeenCalledWith('scan_events');
    expect(chain.select).toHaveBeenCalledWith('created_at');
    expect(chain.gte).toHaveBeenCalledWith('created_at', expect.any(String));
  });

  it('handles all time ranges: 30d, 90d, 1y', async () => {
    for (const range of ['30d', '90d', '1y'] as const) {
      const chain = buildChain({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);
      const result = await getScanFrequency(range);
      expect(result.success).toBe(true);
    }
  });
});

// ── getAssetUtilization ──

describe('getAssetUtilization', () => {
  it('returns counts aggregated by status (maps DB values to interface names)', async () => {
    // DB status values: serviced → active, out_of_service → idle, maintenance → maintenance
    const rows = [
      { status: 'serviced' },
      { status: 'serviced' },
      { status: 'out_of_service' },
      { status: 'maintenance' },
    ];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getAssetUtilization();

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const snap = result.data!;
    expect(snap.active).toBe(2); // serviced
    expect(snap.idle).toBe(1); // out_of_service
    expect(snap.maintenance).toBe(1);
    expect(snap.retired).toBe(0); // not a DB status
    expect(snap.total).toBe(4);
  });

  it('returns zeros when no assets', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getAssetUtilization();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ active: 0, idle: 0, maintenance: 0, retired: 0, total: 0 });
  });

  it('returns error result when query fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'Connection refused' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getAssetUtilization();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Connection refused');
  });

  it('queries assets table with status column', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getAssetUtilization();

    expect(mockClient.from).toHaveBeenCalledWith('assets');
    expect(chain.select).toHaveBeenCalledWith('status');
  });
});

// ── getHazardTrends ──

describe('getHazardTrends', () => {
  it('aggregates hazard alerts by date and severity', async () => {
    const rows = [
      { created_at: '2026-03-19T10:00:00.000Z', severity: 'critical' },
      { created_at: '2026-03-19T12:00:00.000Z', severity: 'high' },
      { created_at: '2026-03-19T15:00:00.000Z', severity: 'critical' },
      { created_at: '2026-03-19T16:00:00.000Z', severity: 'medium' },
      { created_at: '2026-03-20T09:00:00.000Z', severity: 'low' },
    ];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardTrends('30d');

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const data = result.data!;
    const march19 = data.find((p) => p.date === '2026-03-19');
    expect(march19?.critical).toBe(2);
    expect(march19?.high).toBe(1);
    expect(march19?.medium).toBe(1);
    expect(march19?.low).toBe(0);
    const march20 = data.find((p) => p.date === '2026-03-20');
    expect(march20?.low).toBe(1);
  });

  it('returns empty array when no hazards in range', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardTrends('7d');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns error result when query fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'Timeout' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getHazardTrends('90d');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Timeout');
  });

  it('queries hazard_alerts table with created_at and severity', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getHazardTrends('7d');

    expect(mockClient.from).toHaveBeenCalledWith('hazard_alerts');
    expect(chain.select).toHaveBeenCalledWith('created_at, severity');
    expect(chain.gte).toHaveBeenCalledWith('created_at', expect.any(String));
  });
});

// ── getTimeBetweenScans ──

describe('getTimeBetweenScans', () => {
  it('buckets assets by days since last scan (uses last_location_updated_at)', async () => {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    const rows = [
      { last_location_updated_at: daysAgo(3) }, // 0-7 bucket
      { last_location_updated_at: daysAgo(5) }, // 0-7 bucket
      { last_location_updated_at: daysAgo(10) }, // 7-14 bucket
      { last_location_updated_at: daysAgo(20) }, // 14-30 bucket
      { last_location_updated_at: daysAgo(45) }, // 30-60 bucket
      { last_location_updated_at: daysAgo(75) }, // 60-90 bucket
      { last_location_updated_at: daysAgo(100) }, // 90+ bucket
    ];
    const chain = buildChain({ data: rows, error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getTimeBetweenScans('1y');

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const data = result.data!;
    expect(data.length).toBe(6);
    const bucket0 = data.find((b) => b.bucketDays === 0);
    const bucket7 = data.find((b) => b.bucketDays === 7);
    const bucket14 = data.find((b) => b.bucketDays === 14);
    const bucket30 = data.find((b) => b.bucketDays === 30);
    const bucket60 = data.find((b) => b.bucketDays === 60);
    const bucket90 = data.find((b) => b.bucketDays === 90);
    expect(bucket0?.count).toBe(2);
    expect(bucket7?.count).toBe(1);
    expect(bucket14?.count).toBe(1);
    expect(bucket30?.count).toBe(1);
    expect(bucket60?.count).toBe(1);
    expect(bucket90?.count).toBe(1);
  });

  it('returns all 6 buckets even when some are empty', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getTimeBetweenScans('30d');

    expect(result.success).toBe(true);
    expect(result.data!.length).toBe(6);
    result.data!.forEach((b) => expect(b.count).toBe(0));
  });

  it('returns error result when query fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'Query error' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getTimeBetweenScans('7d');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Query error');
  });

  it('queries assets table for last_location_updated_at', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getTimeBetweenScans('30d');

    expect(mockClient.from).toHaveBeenCalledWith('assets');
    expect(chain.select).toHaveBeenCalledWith('last_location_updated_at');
  });
});

// ── getOutstandingAnalyticsAssets ──

describe('getOutstandingAnalyticsAssets', () => {
  // DB columns: last_location_updated_at (no last_scan_date, no last_location string)
  const assetRow = {
    id: 'asset-1',
    asset_number: 'TRL-001',
    category: 'trailer',
    status: 'serviced',
    last_location_updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('returns mapped outstanding assets with camelCase fields', async () => {
    const chain = buildChain({ data: [assetRow], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getOutstandingAnalyticsAssets();

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    const assets = result.data!;
    expect(assets.length).toBe(1);
    expect(assets[0]!.id).toBe('asset-1');
    expect(assets[0]!.assetNumber).toBe('TRL-001');
    expect(assets[0]!.category).toBe('trailer');
    expect(assets[0]!.status).toBe('serviced');
    expect(assets[0]!.lastScanDate).toBe('2026-01-01T00:00:00.000Z');
    expect(assets[0]!.lastLocation).toBeNull(); // not in DB schema
    expect(typeof assets[0]!.daysSinceLastScan).toBe('number');
  });

  it('handles assets with null last_location_updated_at', async () => {
    const rowNullScan = { ...assetRow, last_location_updated_at: null };
    const chain = buildChain({ data: [rowNullScan], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getOutstandingAnalyticsAssets();

    expect(result.success).toBe(true);
    const asset = result.data![0]!;
    expect(asset.lastScanDate).toBeNull();
    expect(asset.daysSinceLastScan).toBeNull();
    expect(asset.lastLocation).toBeNull();
  });

  it('uses default 30 days threshold and filters by or condition on last_location_updated_at', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getOutstandingAnalyticsAssets();

    expect(mockClient.from).toHaveBeenCalledWith('assets');
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining('last_location_updated_at.is.null')
    );
  });

  it('accepts custom days parameter', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const result = await getOutstandingAnalyticsAssets(60);

    expect(result.success).toBe(true);
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining('last_location_updated_at.is.null')
    );
  });

  it('returns error result when query fails', async () => {
    const chain = buildChain({ data: null, error: { message: 'Permission denied' } });
    mockClient.from.mockReturnValue(chain);

    const result = await getOutstandingAnalyticsAssets();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Permission denied');
  });

  it('selects the correct columns from assets', async () => {
    const chain = buildChain({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await getOutstandingAnalyticsAssets();

    expect(chain.select).toHaveBeenCalledWith(
      'id, asset_number, category, status, last_location_updated_at'
    );
  });
});
