import { submitAssetCount } from '../assetCounts';
import type { SubmitAssetCountInput } from '../assetCounts';

// ── Test UUIDs ──

const UUID_DEPOT = '00000000-0000-4000-8000-000000000001';
const UUID_USER = '00000000-0000-4000-8000-000000000002';
const UUID_A1 = '00000000-0000-4000-8000-00000000000a';
const UUID_A2 = '00000000-0000-4000-8000-00000000000b';
const UUID_A3 = '00000000-0000-4000-8000-00000000000c';
const UUID_COMBO = '00000000-0000-4000-8000-0000000000c0';
const UUID_PHOTO = '00000000-0000-4000-8000-00000000f010';
const UUID_SESS = '00000000-0000-4000-8000-000000005e55';

// ── Chainable Supabase Mock ──

// Each table mock tracks calls and lets tests configure return values per-table.
type MockChain = {
  insert: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  select: jest.Mock;
  single: jest.Mock;
  eq: jest.Mock;
};

function createMockChain(): MockChain {
  const chain: MockChain = {
    insert: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    single: jest.fn(),
    eq: jest.fn(),
  };

  // Default chainable wiring — each method returns the chain object
  chain.insert.mockReturnValue(chain);
  chain.upsert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  // single() resolves the chain
  chain.single.mockResolvedValue({ data: null, error: null });

  return chain;
}

// One chain per table name
const tableChains: Record<string, MockChain> = {};

function getChain(tableName: string): MockChain {
  if (!tableChains[tableName]) {
    tableChains[tableName] = createMockChain();
  }
  return tableChains[tableName];
}

jest.mock('../client', () => ({
  getSupabaseClient: () => ({
    from: (tableName: string) => getChain(tableName),
    rpc: jest.fn().mockRejectedValue(new Error('RPC not available')),
  }),
}));

// ── Helpers ──

const now = new Date().toISOString();

function makeSessionRow(id: string) {
  return {
    id,
    depot_id: UUID_DEPOT,
    counted_by: UUID_USER,
    started_at: now,
    completed_at: null,
    status: 'in_progress',
    total_assets_counted: 0,
    notes: null,
    created_at: now,
    updated_at: now,
  };
}

function makeItemRow(id: string, sessionId: string, assetId: string) {
  return {
    id,
    session_id: sessionId,
    asset_id: assetId,
    scanned_at: now,
    combination_id: null,
    combination_position: null,
  };
}

function makeMetadataRow(id: string, sessionId: string, combinationId: string) {
  return {
    id,
    session_id: sessionId,
    combination_id: combinationId,
    notes: 'test notes',
    created_at: now,
  };
}

function makePhotoRow(id: string, sessionId: string, combinationId: string) {
  return {
    id,
    session_id: sessionId,
    combination_id: combinationId,
    photo_id: UUID_PHOTO,
    created_at: now,
  };
}

function makeCompletedSessionRow(id: string) {
  return {
    ...makeSessionRow(id),
    status: 'completed',
    completed_at: now,
  };
}

function baseInput(overrides?: Partial<SubmitAssetCountInput>): SubmitAssetCountInput {
  return {
    depotId: UUID_DEPOT,
    countedBy: UUID_USER,
    items: [
      { assetId: UUID_A1, combinationId: null, combinationPosition: null },
      { assetId: UUID_A2, combinationId: null, combinationPosition: null },
    ],
    combinations: [],
    ...overrides,
  };
}

function setupHappyPath(sessionId: string, itemCount: number) {
  // Session creation
  getChain('asset_count_sessions').single.mockResolvedValueOnce({
    data: makeSessionRow(sessionId),
    error: null,
  });

  // Item creation — one call per item (fallback path after RPC mock rejects)
  for (let i = 0; i < itemCount; i++) {
    const assetUuids = [UUID_A1, UUID_A2, UUID_A3, '00000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-00000000000e'];
    getChain('asset_count_items').single.mockResolvedValueOnce({
      data: makeItemRow(`item-${i}`, sessionId, assetUuids[i] ?? UUID_A1),
      error: null,
    });
  }

  // Session completion
  getChain('asset_count_sessions').single.mockResolvedValueOnce({
    data: makeCompletedSessionRow(sessionId),
    error: null,
  });
}

beforeEach(() => {
  // Reset all table chains
  for (const key of Object.keys(tableChains)) {
    delete tableChains[key];
  }
});

// ── Tests ──

describe('submitAssetCount', () => {
  describe('happy path', () => {
    it('creates session, inserts all items, completes session (standalone only)', async () => {
      setupHappyPath(UUID_SESS, 2);

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBe(UUID_SESS);
      expect(result.data!.status).toBe('completed');
    });

    it('handles combination items with combination_id and combination_position', async () => {
      const input = baseInput({
        items: [
          { assetId: UUID_A1, combinationId: UUID_COMBO, combinationPosition: 1 },
          { assetId: UUID_A2, combinationId: UUID_COMBO, combinationPosition: 2 },
        ],
        combinations: [{ combinationId: UUID_COMBO, notes: null, photoId: null }],
      });

      setupHappyPath(UUID_SESS, 2);

      const result = await submitAssetCount(input);

      expect(result.success).toBe(true);

      // Verify items were inserted with combination data
      const insertCalls = getChain('asset_count_items').insert.mock.calls;
      expect(insertCalls[0][0]).toEqual(expect.objectContaining({
        combination_id: UUID_COMBO,
        combination_position: 1,
      }));
      expect(insertCalls[1][0]).toEqual(expect.objectContaining({
        combination_id: UUID_COMBO,
        combination_position: 2,
      }));
    });

    it('inserts combination metadata when notes present', async () => {
      const input = baseInput({
        items: [
          { assetId: UUID_A1, combinationId: UUID_COMBO, combinationPosition: 1 },
          { assetId: UUID_A2, combinationId: UUID_COMBO, combinationPosition: 2 },
        ],
        combinations: [{ combinationId: UUID_COMBO, notes: 'Bolted together', photoId: null }],
      });

      // Session creation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Items (fallback path)
      getChain('asset_count_items').single
        .mockResolvedValueOnce({ data: makeItemRow('i1', UUID_SESS, UUID_A1), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i2', UUID_SESS, UUID_A2), error: null });
      // Metadata upsert
      getChain('asset_count_combination_metadata').single.mockResolvedValueOnce({
        data: makeMetadataRow('m1', UUID_SESS, UUID_COMBO),
        error: null,
      });
      // Completion
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeCompletedSessionRow(UUID_SESS),
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(true);
      expect(getChain('asset_count_combination_metadata').upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: UUID_SESS,
          combination_id: UUID_COMBO,
          notes: 'Bolted together',
        }),
        expect.anything()
      );
    });

    it('links combination photos when photoId present', async () => {
      const input = baseInput({
        items: [
          { assetId: UUID_A1, combinationId: UUID_COMBO, combinationPosition: 1 },
          { assetId: UUID_A2, combinationId: UUID_COMBO, combinationPosition: 2 },
        ],
        combinations: [{ combinationId: UUID_COMBO, notes: null, photoId: UUID_PHOTO }],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Items (fallback path)
      getChain('asset_count_items').single
        .mockResolvedValueOnce({ data: makeItemRow('i1', UUID_SESS, UUID_A1), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i2', UUID_SESS, UUID_A2), error: null });
      // Photo insert
      getChain('asset_count_combination_photos').single.mockResolvedValueOnce({
        data: makePhotoRow('p1', UUID_SESS, UUID_COMBO),
        error: null,
      });
      // Completion
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeCompletedSessionRow(UUID_SESS),
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(true);
      expect(getChain('asset_count_combination_photos').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: UUID_SESS,
          combination_id: UUID_COMBO,
          photo_id: UUID_PHOTO,
        })
      );
    });

    it('skips metadata insert when notes is null', async () => {
      const input = baseInput({
        combinations: [{ combinationId: UUID_COMBO, notes: null, photoId: null }],
      });

      setupHappyPath(UUID_SESS, 2);

      await submitAssetCount(input);

      // Metadata table should not have been accessed
      expect(tableChains['asset_count_combination_metadata']).toBeUndefined();
    });

    it('skips photo link when photoId is null', async () => {
      const input = baseInput({
        combinations: [{ combinationId: UUID_COMBO, notes: null, photoId: null }],
      });

      setupHappyPath(UUID_SESS, 2);

      await submitAssetCount(input);

      expect(tableChains['asset_count_combination_photos']).toBeUndefined();
    });

    it('passes sessionNotes to completeAssetCountSession', async () => {
      const input = baseInput({ sessionNotes: 'Counted during rain' });

      setupHappyPath(UUID_SESS, 2);

      await submitAssetCount(input);

      // The last call on asset_count_sessions should be the update for completion
      const updateCalls = getChain('asset_count_sessions').update.mock.calls;
      const lastUpdate = updateCalls[updateCalls.length - 1][0];
      expect(lastUpdate).toEqual(expect.objectContaining({
        status: 'completed',
        notes: 'Counted during rain',
      }));
    });
  });

  describe('count accuracy', () => {
    it('number of createAssetCountItem calls equals input.items.length', async () => {
      const assetUuids = Array.from({ length: 5 }, (_, i) =>
        `00000000-0000-4000-8000-${(10 + i).toString(16).padStart(12, '0')}`
      );
      const items = assetUuids.map((id) => ({
        assetId: id,
        combinationId: null,
        combinationPosition: null,
      }));

      const input = baseInput({ items });
      setupHappyPath(UUID_SESS, 5);

      await submitAssetCount(input);

      expect(getChain('asset_count_items').insert).toHaveBeenCalledTimes(5);
    });

    it('each item\'s combinationId/combinationPosition matches input', async () => {
      const input = baseInput({
        items: [
          { assetId: UUID_A1, combinationId: null, combinationPosition: null },
          { assetId: UUID_A2, combinationId: UUID_COMBO, combinationPosition: 1 },
          { assetId: UUID_A3, combinationId: UUID_COMBO, combinationPosition: 2 },
        ],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Items (fallback path)
      getChain('asset_count_items').single
        .mockResolvedValueOnce({ data: makeItemRow('i1', UUID_SESS, UUID_A1), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i2', UUID_SESS, UUID_A2), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i3', UUID_SESS, UUID_A3), error: null });
      // Completion
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeCompletedSessionRow(UUID_SESS),
        error: null,
      });

      await submitAssetCount(input);

      const insertCalls = getChain('asset_count_items').insert.mock.calls;
      expect(insertCalls[0][0].combination_id).toBeNull();
      expect(insertCalls[0][0].combination_position).toBeNull();
      expect(insertCalls[1][0].combination_id).toBe(UUID_COMBO);
      expect(insertCalls[1][0].combination_position).toBe(1);
      expect(insertCalls[2][0].combination_id).toBe(UUID_COMBO);
      expect(insertCalls[2][0].combination_position).toBe(2);
    });
  });

  describe('error handling / rollback', () => {
    it('cancels session when createAssetCountItem fails', async () => {
      // Session creation succeeds
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // First item fails
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'insert failed', code: 'PGRST' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow(UUID_SESS), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create item');

      // Verify cancel was called via update
      const updateCalls = getChain('asset_count_sessions').update.mock.calls;
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      expect(updateCalls[0][0]).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('cancels session when upsertCombinationMetadata fails', async () => {
      const input = baseInput({
        items: [{ assetId: UUID_A1, combinationId: UUID_COMBO, combinationPosition: 1 }],
        combinations: [{ combinationId: UUID_COMBO, notes: 'test', photoId: null }],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Item
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: makeItemRow('i1', UUID_SESS, UUID_A1),
        error: null,
      });
      // Metadata upsert fails
      getChain('asset_count_combination_metadata').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'upsert failed', code: 'PGRST' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow(UUID_SESS), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save metadata');
    });

    it('cancels session when createCombinationPhoto fails', async () => {
      const input = baseInput({
        items: [{ assetId: UUID_A1, combinationId: UUID_COMBO, combinationPosition: 1 }],
        combinations: [{ combinationId: UUID_COMBO, notes: null, photoId: UUID_PHOTO }],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Item
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: makeItemRow('i1', UUID_SESS, UUID_A1),
        error: null,
      });
      // Photo insert fails
      getChain('asset_count_combination_photos').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'photo link failed', code: 'PGRST' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow(UUID_SESS), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to link photo');
    });

    it('cancels session on unexpected exception', async () => {
      // Session creation succeeds
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Item creation throws
      getChain('asset_count_items').single.mockRejectedValueOnce(new Error('Network error'));
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow(UUID_SESS), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('returns error when createAssetCountSession itself fails', async () => {
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'permission denied', code: '42501' },
      });

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create session');
      // No cancel should be attempted since session was never created
      expect(getChain('asset_count_sessions').update).not.toHaveBeenCalled();
    });
  });

  describe('duplicate handling', () => {
    it('returns specific error message for duplicate asset (23505)', async () => {
      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow(UUID_SESS),
        error: null,
      });
      // Duplicate item
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'unique violation', code: '23505' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow(UUID_SESS), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset already counted in this session');
    });
  });

  describe('validation', () => {
    it('rejects input with missing required fields', async () => {
      const result = await submitAssetCount({
        depotId: 'not-a-uuid',
        countedBy: UUID_USER,
        items: [],
        combinations: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid count data. Please try again.');
    });

    it('rejects input with empty items array', async () => {
      const result = await submitAssetCount({
        depotId: UUID_DEPOT,
        countedBy: UUID_USER,
        items: [],
        combinations: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid count data. Please try again.');
    });
  });
});
