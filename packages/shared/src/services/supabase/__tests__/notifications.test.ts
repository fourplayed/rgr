import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  createNotification,
} from '../notifications';
import type { CreateNotificationInput } from '../notifications';

// ── Mock chain helpers ──

const mockSingle = jest.fn();
const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

// The mock client returned by getSupabaseClient
const mockClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock('../client', () => ({
  getSupabaseClient: () => mockClient,
}));

// ── Constants ──

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const NOTIF_ID = '550e8400-e29b-41d4-a716-446655440001';
const ASSET_ID = '550e8400-e29b-41d4-a716-446655440002';

const dbRow = {
  id: NOTIF_ID,
  user_id: USER_ID,
  type: 'hazard',
  title: 'Hazard Detected',
  body: 'A new hazard has been detected.',
  resource_id: ASSET_ID,
  resource_type: 'asset',
  read: false,
  created_at: '2026-03-20T10:00:00.000Z',
};

const mappedNotification = {
  id: NOTIF_ID,
  userId: USER_ID,
  type: 'hazard',
  title: 'Hazard Detected',
  body: 'A new hazard has been detected.',
  resourceId: ASSET_ID,
  resourceType: 'asset',
  read: false,
  createdAt: '2026-03-20T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });
});

// ── getNotifications ──

describe('getNotifications', () => {
  it('returns mapped notifications for current user, newest first', async () => {
    mockLimit.mockResolvedValue({ data: [dbRow], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockClient.from.mockReturnValue({ select: mockSelect });

    const result = await getNotifications();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([mappedNotification]);
    expect(result.error).toBeNull();
    expect(mockEq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('respects optional limit parameter', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockClient.from.mockReturnValue({ select: mockSelect });

    await getNotifications(5);

    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it('returns error result when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const result = await getNotifications();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns error result when query fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockClient.from.mockReturnValue({ select: mockSelect });

    const result = await getNotifications();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('DB error');
  });

  it('handles null resource_id and resource_type', async () => {
    const rowWithNulls = { ...dbRow, resource_id: null, resource_type: null };
    mockLimit.mockResolvedValue({ data: [rowWithNulls], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockClient.from.mockReturnValue({ select: mockSelect });

    const result = await getNotifications();

    expect(result.success).toBe(true);
    expect(result.data![0]!.resourceId).toBeNull();
    expect(result.data![0]!.resourceType).toBeNull();
  });
});

// ── getUnreadCount ──

describe('getUnreadCount', () => {
  it('returns unread count for current user', async () => {
    const mockEqRead = jest.fn().mockResolvedValue({ count: 3, error: null });
    const mockEqUser = jest.fn(() => ({ eq: mockEqRead }));
    const mockSelectCount = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ select: mockSelectCount });

    const result = await getUnreadCount();

    expect(result.success).toBe(true);
    expect(result.data).toBe(3);
    expect(result.error).toBeNull();
  });

  it('returns 0 when count is null', async () => {
    const mockEqRead = jest.fn().mockResolvedValue({ count: null, error: null });
    const mockEqUser = jest.fn(() => ({ eq: mockEqRead }));
    const mockSelectCount = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ select: mockSelectCount });

    const result = await getUnreadCount();

    expect(result.success).toBe(true);
    expect(result.data).toBe(0);
  });

  it('returns error result when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const result = await getUnreadCount();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it('returns error result when query fails', async () => {
    const mockEqRead = jest.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } });
    const mockEqUser = jest.fn(() => ({ eq: mockEqRead }));
    const mockSelectCount = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ select: mockSelectCount });

    const result = await getUnreadCount();

    expect(result.success).toBe(false);
    expect(result.error).toContain('DB error');
  });
});

// ── markRead ──

describe('markRead', () => {
  it('marks a single notification as read', async () => {
    const mockEqId = jest.fn().mockResolvedValue({ error: null });
    const mockEqUser = jest.fn(() => ({ eq: mockEqId }));
    const mockUpdateFn = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ update: mockUpdateFn });

    const result = await markRead(NOTIF_ID);

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeNull();
    expect(mockUpdateFn).toHaveBeenCalledWith({ read: true });
    expect(mockEqUser).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockEqId).toHaveBeenCalledWith('id', NOTIF_ID);
  });

  it('returns error result when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const result = await markRead(NOTIF_ID);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it('returns error result when update fails', async () => {
    const mockEqId = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });
    const mockEqUser = jest.fn(() => ({ eq: mockEqId }));
    const mockUpdateFn = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ update: mockUpdateFn });

    const result = await markRead(NOTIF_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Update failed');
  });
});

// ── markAllRead ──

describe('markAllRead', () => {
  it('marks all notifications as read for current user', async () => {
    const mockEqUser = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateFn = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ update: mockUpdateFn });

    const result = await markAllRead();

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeNull();
    expect(mockUpdateFn).toHaveBeenCalledWith({ read: true });
    expect(mockEqUser).toHaveBeenCalledWith('user_id', USER_ID);
  });

  it('returns error result when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const result = await markAllRead();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it('returns error result when update fails', async () => {
    const mockEqUser = jest.fn().mockResolvedValue({ error: { message: 'Bulk update failed' } });
    const mockUpdateFn = jest.fn(() => ({ eq: mockEqUser }));
    mockClient.from.mockReturnValue({ update: mockUpdateFn });

    const result = await markAllRead();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Bulk update failed');
  });
});

// ── createNotification ──

describe('createNotification', () => {
  const input: CreateNotificationInput = {
    userId: USER_ID,
    type: 'hazard',
    title: 'Hazard Detected',
    body: 'A new hazard has been detected.',
    resourceId: ASSET_ID,
    resourceType: 'asset',
  };

  it('inserts a notification and returns the mapped result', async () => {
    mockSingle.mockResolvedValue({ data: dbRow, error: null });
    const mockSelectFn = jest.fn(() => ({ single: mockSingle }));
    const mockInsertFn = jest.fn(() => ({ select: mockSelectFn }));
    mockClient.from.mockReturnValue({ insert: mockInsertFn });

    const result = await createNotification(input);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mappedNotification);
    expect(result.error).toBeNull();
    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        type: 'hazard',
        title: 'Hazard Detected',
        body: 'A new hazard has been detected.',
        resource_id: ASSET_ID,
        resource_type: 'asset',
      })
    );
  });

  it('works without optional resourceId and resourceType', async () => {
    const minimalInput: CreateNotificationInput = {
      userId: USER_ID,
      type: 'scan_overdue',
      title: 'Scan Overdue',
      body: 'An asset has not been scanned.',
    };
    const minimalRow = {
      ...dbRow,
      type: 'scan_overdue',
      title: 'Scan Overdue',
      body: 'An asset has not been scanned.',
      resource_id: null,
      resource_type: null,
    };
    mockSingle.mockResolvedValue({ data: minimalRow, error: null });
    const mockSelectFn = jest.fn(() => ({ single: mockSingle }));
    const mockInsertFn = jest.fn(() => ({ select: mockSelectFn }));
    mockClient.from.mockReturnValue({ insert: mockInsertFn });

    const result = await createNotification(minimalInput);

    expect(result.success).toBe(true);
    expect(result.data!.resourceId).toBeNull();
    expect(result.data!.resourceType).toBeNull();
  });

  it('returns error result when insert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    const mockSelectFn = jest.fn(() => ({ single: mockSingle }));
    const mockInsertFn = jest.fn(() => ({ select: mockSelectFn }));
    mockClient.from.mockReturnValue({ insert: mockInsertFn });

    const result = await createNotification(input);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Insert failed');
  });
});
