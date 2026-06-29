import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  getFriendOnlines: vi.fn(),
  getGroupInfo: vi.fn(),
  getGroupMembersInfo: vi.fn(),
  changeGroupName: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const rateLimiterMock = vi.hoisted(() => ({
  checkLimits: vi.fn(),
  recordSend: vi.fn(),
}));

vi.mock('../src/modules/zalo/zalo-pool.js', () => ({
  zaloPool: {
    getInstance: vi.fn(() => ({
      status: 'connected',
      api: apiMock,
    })),
    reconnect: vi.fn(),
  },
}));

vi.mock('../src/modules/zalo/zalo-rate-limiter.js', () => ({
  zaloRateLimiter: rateLimiterMock,
}));

vi.mock('../src/shared/database/prisma-client.js', () => ({
  prisma: {
    zaloAccount: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../src/shared/utils/logger.js', () => ({
  logger: loggerMock,
}));

const { zaloOps } = await import('../src/shared/zalo-operations.js');

beforeEach(() => {
  vi.clearAllMocks();
  rateLimiterMock.checkLimits.mockResolvedValue({ allowed: true });
});

describe('zaloOps.getFriendOnlines', () => {
  it('returns an empty presence list for malformed SDK JSON responses without error logging', async () => {
    apiMock.getFriendOnlines.mockRejectedValue(new SyntaxError('Unexpected token \'\', "🧸 LUXURY "... is not valid JSON'));

    await expect(zaloOps.getFriendOnlines('za-1')).resolves.toEqual({ onlines: [] });
    expect(loggerMock.error).not.toHaveBeenCalled();
    expect(loggerMock.debug).toHaveBeenCalled();
  });
});

describe('zaloOps Group Caching', () => {
  beforeEach(() => {
    apiMock.getGroupInfo.mockReset();
    apiMock.getGroupMembersInfo.mockReset();
    apiMock.changeGroupName.mockReset();
  });

  it('caches getGroupInfo results and can bypass cache', async () => {
    apiMock.getGroupInfo.mockResolvedValue({ id: 'g1', name: 'Test Group' });

    // First call: should call SDK
    const res1 = await zaloOps.getGroupInfo('za-1', 'g1');
    expect(res1).toEqual({ id: 'g1', name: 'Test Group' });
    expect(apiMock.getGroupInfo).toHaveBeenCalledTimes(1);

    // Second call: should hit cache
    const res2 = await zaloOps.getGroupInfo('za-1', 'g1');
    expect(res2).toEqual({ id: 'g1', name: 'Test Group' });
    expect(apiMock.getGroupInfo).toHaveBeenCalledTimes(1);

    // Third call with bypassCache = true: should call SDK again
    const res3 = await zaloOps.getGroupInfo('za-1', 'g1', true);
    expect(res3).toEqual({ id: 'g1', name: 'Test Group' });
    expect(apiMock.getGroupInfo).toHaveBeenCalledTimes(2);
  });

  it('invalidates getGroupInfo cache on group mutation (e.g. renameGroup)', async () => {
    apiMock.getGroupInfo.mockResolvedValue({ id: 'g-mutate', name: 'Test Group' });
    apiMock.changeGroupName.mockResolvedValue({ success: true });

    // Seed cache
    await zaloOps.getGroupInfo('za-1', 'g-mutate');
    expect(apiMock.getGroupInfo).toHaveBeenCalledTimes(1);

    // Modify group
    await zaloOps.renameGroup('za-1', 'New Name', 'g-mutate');
    expect(apiMock.changeGroupName).toHaveBeenCalledWith('New Name', 'g-mutate');

    // Query again: should call SDK (cache was invalidated)
    await zaloOps.getGroupInfo('za-1', 'g-mutate');
    expect(apiMock.getGroupInfo).toHaveBeenCalledTimes(2);
  });

  it('caches individual member profiles in getGroupMembersInfo and only fetches uncached', async () => {
    apiMock.getGroupMembersInfo.mockImplementation(async (uids: string[]) => {
      const profiles: Record<string, any> = {};
      for (const uid of uids) {
        profiles[uid] = { uid, name: `User ${uid}` };
      }
      return { profiles };
    });

    // Request profiles for u1 and u2
    const res1 = await zaloOps.getGroupMembersInfo('za-1', ['u1', 'u2']);
    expect(res1).toEqual([
      { uid: 'u1', name: 'User u1' },
      { uid: 'u2', name: 'User u2' },
    ]);
    expect(apiMock.getGroupMembersInfo).toHaveBeenCalledWith(['u1', 'u2']);
    expect(apiMock.getGroupMembersInfo).toHaveBeenCalledTimes(1);

    // Reset mock calls count to verify next calls
    apiMock.getGroupMembersInfo.mockClear();

    // Request profiles for u2 (cached) and u3 (uncached)
    const res2 = await zaloOps.getGroupMembersInfo('za-1', ['u2', 'u3']);
    expect(res2).toEqual([
      { uid: 'u2', name: 'User u2' },
      { uid: 'u3', name: 'User u3' },
    ]);
    // Should ONLY fetch u3 from the SDK
    expect(apiMock.getGroupMembersInfo).toHaveBeenCalledWith(['u3']);
    expect(apiMock.getGroupMembersInfo).toHaveBeenCalledTimes(1);
  });
});
