import { submitAssetCount } from '../assetCounts';
import type { SubmitAssetCountInput } from '../assetCounts';

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
  }),
}));

// ── Helpers ──

const now = new Date().toISOString();

function makeSessionRow(id: string) {
  return {
    id,
    depot_id: 'depot-1',
    counted_by: 'user-1',
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
    photo_id: 'photo-1',
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
    depotId: 'depot-1',
    countedBy: 'user-1',
    items: [
      { assetId: 'a1', combinationId: null, combinationPosition: null },
      { assetId: 'a2', combinationId: null, combinationPosition: null },
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

  // Item creation — one call per item
  for (let i = 0; i < itemCount; i++) {
    getChain('asset_count_items').single.mockResolvedValueOnce({
      data: makeItemRow(`item-${i}`, sessionId, `a${i + 1}`),
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
      setupHappyPath('sess-1', 2);

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBe('sess-1');
      expect(result.data!.status).toBe('completed');
    });

    it('handles combination items with combination_id and combination_position', async () => {
      const input = baseInput({
        items: [
          { assetId: 'a1', combinationId: 'combo-1', combinationPosition: 1 },
          { assetId: 'a2', combinationId: 'combo-1', combinationPosition: 2 },
        ],
        combinations: [{ combinationId: 'combo-1', notes: null, photoId: null }],
      });

      setupHappyPath('sess-1', 2);

      const result = await submitAssetCount(input);

      expect(result.success).toBe(true);

      // Verify items were inserted with combination data
      const insertCalls = getChain('asset_count_items').insert.mock.calls;
      expect(insertCalls[0][0]).toEqual(expect.objectContaining({
        combination_id: 'combo-1',
        combination_position: 1,
      }));
      expect(insertCalls[1][0]).toEqual(expect.objectContaining({
        combination_id: 'combo-1',
        combination_position: 2,
      }));
    });

    it('inserts combination metadata when notes present', async () => {
      const input = baseInput({
        items: [
          { assetId: 'a1', combinationId: 'combo-1', combinationPosition: 1 },
          { assetId: 'a2', combinationId: 'combo-1', combinationPosition: 2 },
        ],
        combinations: [{ combinationId: 'combo-1', notes: 'Bolted together', photoId: null }],
      });

      // Session creation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Items
      getChain('asset_count_items').single
        .mockResolvedValueOnce({ data: makeItemRow('i1', 'sess-1', 'a1'), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i2', 'sess-1', 'a2'), error: null });
      // Metadata upsert
      getChain('asset_count_combination_metadata').single.mockResolvedValueOnce({
        data: makeMetadataRow('m1', 'sess-1', 'combo-1'),
        error: null,
      });
      // Completion
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeCompletedSessionRow('sess-1'),
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(true);
      expect(getChain('asset_count_combination_metadata').upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'sess-1',
          combination_id: 'combo-1',
          notes: 'Bolted together',
        }),
        expect.anything()
      );
    });

    it('links combination photos when photoId present', async () => {
      const input = baseInput({
        items: [
          { assetId: 'a1', combinationId: 'combo-1', combinationPosition: 1 },
          { assetId: 'a2', combinationId: 'combo-1', combinationPosition: 2 },
        ],
        combinations: [{ combinationId: 'combo-1', notes: null, photoId: 'photo-1' }],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Items
      getChain('asset_count_items').single
        .mockResolvedValueOnce({ data: makeItemRow('i1', 'sess-1', 'a1'), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i2', 'sess-1', 'a2'), error: null });
      // Photo insert
      getChain('asset_count_combination_photos').single.mockResolvedValueOnce({
        data: makePhotoRow('p1', 'sess-1', 'combo-1'),
        error: null,
      });
      // Completion
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeCompletedSessionRow('sess-1'),
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(true);
      expect(getChain('asset_count_combination_photos').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'sess-1',
          combination_id: 'combo-1',
          photo_id: 'photo-1',
        })
      );
    });

    it('skips metadata insert when notes is null', async () => {
      const input = baseInput({
        combinations: [{ combinationId: 'combo-1', notes: null, photoId: null }],
      });

      setupHappyPath('sess-1', 2);

      await submitAssetCount(input);

      // Metadata table should not have been accessed
      expect(tableChains['asset_count_combination_metadata']).toBeUndefined();
    });

    it('skips photo link when photoId is null', async () => {
      const input = baseInput({
        combinations: [{ combinationId: 'combo-1', notes: null, photoId: null }],
      });

      setupHappyPath('sess-1', 2);

      await submitAssetCount(input);

      expect(tableChains['asset_count_combination_photos']).toBeUndefined();
    });

    it('passes sessionNotes to completeAssetCountSession', async () => {
      const input = baseInput({ sessionNotes: 'Counted during rain' });

      setupHappyPath('sess-1', 2);

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
      const items = Array.from({ length: 5 }, (_, i) => ({
        assetId: `a${i}`,
        combinationId: null,
        combinationPosition: null,
      }));

      const input = baseInput({ items });
      setupHappyPath('sess-1', 5);

      await submitAssetCount(input);

      expect(getChain('asset_count_items').insert).toHaveBeenCalledTimes(5);
    });

    it('each item\'s combinationId/combinationPosition matches input', async () => {
      const input = baseInput({
        items: [
          { assetId: 'a1', combinationId: null, combinationPosition: null },
          { assetId: 'a2', combinationId: 'combo-1', combinationPosition: 1 },
          { assetId: 'a3', combinationId: 'combo-1', combinationPosition: 2 },
        ],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Items
      getChain('asset_count_items').single
        .mockResolvedValueOnce({ data: makeItemRow('i1', 'sess-1', 'a1'), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i2', 'sess-1', 'a2'), error: null })
        .mockResolvedValueOnce({ data: makeItemRow('i3', 'sess-1', 'a3'), error: null });
      // Completion
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeCompletedSessionRow('sess-1'),
        error: null,
      });

      await submitAssetCount(input);

      const insertCalls = getChain('asset_count_items').insert.mock.calls;
      expect(insertCalls[0][0].combination_id).toBeNull();
      expect(insertCalls[0][0].combination_position).toBeNull();
      expect(insertCalls[1][0].combination_id).toBe('combo-1');
      expect(insertCalls[1][0].combination_position).toBe(1);
      expect(insertCalls[2][0].combination_id).toBe('combo-1');
      expect(insertCalls[2][0].combination_position).toBe(2);
    });
  });

  describe('error handling / rollback', () => {
    it('cancels session when createAssetCountItem fails', async () => {
      // Session creation succeeds
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // First item fails
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'insert failed', code: 'PGRST' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow('sess-1'), status: 'cancelled' },
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
        items: [{ assetId: 'a1', combinationId: 'combo-1', combinationPosition: 1 }],
        combinations: [{ combinationId: 'combo-1', notes: 'test', photoId: null }],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Item
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: makeItemRow('i1', 'sess-1', 'a1'),
        error: null,
      });
      // Metadata upsert fails
      getChain('asset_count_combination_metadata').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'upsert failed', code: 'PGRST' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow('sess-1'), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save metadata');
    });

    it('cancels session when createCombinationPhoto fails', async () => {
      const input = baseInput({
        items: [{ assetId: 'a1', combinationId: 'combo-1', combinationPosition: 1 }],
        combinations: [{ combinationId: 'combo-1', notes: null, photoId: 'photo-1' }],
      });

      // Session
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Item
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: makeItemRow('i1', 'sess-1', 'a1'),
        error: null,
      });
      // Photo insert fails
      getChain('asset_count_combination_photos').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'photo link failed', code: 'PGRST' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow('sess-1'), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to link photo');
    });

    it('cancels session on unexpected exception', async () => {
      // Session creation succeeds
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Item creation throws
      getChain('asset_count_items').single.mockRejectedValueOnce(new Error('Network error'));
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow('sess-1'), status: 'cancelled' },
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
        data: makeSessionRow('sess-1'),
        error: null,
      });
      // Duplicate item
      getChain('asset_count_items').single.mockResolvedValueOnce({
        data: null,
        error: { message: 'unique violation', code: '23505' },
      });
      // Cancellation
      getChain('asset_count_sessions').single.mockResolvedValueOnce({
        data: { ...makeSessionRow('sess-1'), status: 'cancelled' },
        error: null,
      });

      const result = await submitAssetCount(baseInput());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset already counted in this session');
    });
  });
});
