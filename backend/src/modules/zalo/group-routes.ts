// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
/**
 * group-routes.ts — Group info, CRUD, and membership management.
 * Routes: /api/v1/zalo-accounts/:accountId/groups
 */
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth-middleware.js';
import { zaloOps } from '../../shared/zalo-operations.js';
import { resolveAccount, checkAccess, handleError } from './zalo-route-helpers.js';
import { prisma } from '../../shared/database/prisma-client.js';
import { logger } from '../../shared/utils/logger.js';

export async function groupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  const BASE = '/api/v1/zalo-accounts/:accountId/groups';

  // ── Group Info ──────────────────────────────────────────────────────────────

  app.get<{ Params: { accountId: string } }>(BASE, async (request, reply) => {
    const { accountId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;
      // zca-js getAllGroups() trả OBJECT { gridVerMap:{id:ver}, gridInfoMap:{id:{...}} },
      // KHÔNG phải mảng. Trước đây trả thẳng object này → FE (group-list.vue,
      // chatbot listGroups) làm Array.isArray → false → danh sách nhóm luôn rỗng.
      // Chuẩn hoá thành mảng [{id,name,totalMember}]: gridVerMap là nguồn ID đầy đủ.
      type GInfo = { name?: string; groupName?: string; totalMember?: number; memberCount?: number; memVerList?: unknown[] };
      const raw = (await zaloOps.getAllGroups(accountId)) as {
        gridVerMap?: Record<string, unknown>;
        gridInfoMap?: Record<string, GInfo>;
      } | null;
      const verMap = raw?.gridVerMap ?? {};
      const infoMap: Record<string, GInfo> = { ...(raw?.gridInfoMap ?? {}) };
      const ids = Object.keys(verMap).length ? Object.keys(verMap) : Object.keys(infoMap);

      // getAllGroups thường KHÔNG kèm tên nhóm (gridInfoMap rỗng/thiếu name) → phải
      // bù bằng getGroupInfo (nhận mảng id, trả gridInfoMap có name + totalMember).
      // Chunk 50 id/call để tránh request quá lớn bị Zalo từ chối.
      const missing = ids.filter((id) => !(infoMap[id]?.name || infoMap[id]?.groupName));
      for (let i = 0; i < missing.length; i += 50) {
        const chunk = missing.slice(i, i + 50);
        try {
          const more = (await zaloOps.getGroupInfo(accountId, chunk)) as { gridInfoMap?: Record<string, GInfo> };
          Object.assign(infoMap, more?.gridInfoMap ?? {});
        } catch { /* giữ id, tên để trống — vẫn gán bot được */ }
      }

      const groups = ids.map((id) => {
        const g = infoMap[id] ?? {};
        return {
          id,
          name: g.name || g.groupName || '',
          totalMember:
            g.totalMember ?? g.memberCount ?? (Array.isArray(g.memVerList) ? g.memVerList.length : 0),
        };
      });
      return { groups };
    } catch (err) { return handleError(reply, err, 'getAllGroups'); }
  });

  app.get<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;
      return { group: await zaloOps.getGroupInfo(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'getGroupInfo'); }
  });

  app.get<{ Params: { accountId: string; groupId: string }; Querystring: { refresh?: string } }>(`${BASE}/:groupId/members`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const forceRefresh = request.query.refresh === 'true';
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;

      const info = await zaloOps.getGroupInfo(accountId, groupId, forceRefresh) as any;
      const grid = info?.gridInfoMap?.[groupId] ?? Object.values(info?.gridInfoMap ?? {})[0];
      
      const rawVerIds: string[] = Array.isArray(grid?.memVerList) ? grid.memVerList : [];
      const memFromVer = rawVerIds.map((e) => String(e).split('_')[0]).filter(Boolean);
      const memFromCurrent = (Array.isArray(grid?.currentMems) ? grid.currentMems : [])
        .map((m: any) => m?.id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
      const memFromMemberIds = Array.isArray(grid?.memberIds) ? grid.memberIds.map(String) : [];

      const uids = [...new Set([
        ...memFromMemberIds,
        ...memFromVer,
        ...memFromCurrent,
      ])].filter(Boolean);

      if (uids.length === 0) return { members: [] };

      // Fetch detailed profiles
      let detailedMembers: any[] = [];
      try {
        const res = await zaloOps.getGroupMembersInfo(accountId, uids, forceRefresh) as any;
        if (res && res.profiles && typeof res.profiles === 'object') {
          detailedMembers = Object.values(res.profiles);
        } else if (Array.isArray(res)) {
          detailedMembers = res;
        } else if (res && Array.isArray(res.members)) {
          detailedMembers = res.members;
        } else if (res && typeof res === 'object') {
          detailedMembers = Object.values(res);
        }
      } catch (err) {
        logger.warn(`[getGroupMembers] getGroupMembersInfo failed: ${(err as Error).message}`);
      }

      const detailMap = new Map<string, { name: string; avatar: string | null }>();
      for (const m of detailedMembers) {
        const rawUid = String(m?.uid || m?.userId || m?.id || m?.zaloId || '');
        if (rawUid) {
          const stripped = rawUid.split('_')[0];
          const info = {
            name: m?.displayName || m?.name || m?.dName || m?.zaloName || '',
            avatar: m?.avatar || m?.avatarUrl || m?.avt || m?.fullAvt || null,
          };
          detailMap.set(rawUid, info);
          detailMap.set(stripped, info);
          detailMap.set(`${stripped}_0`, info);
        }
      }

      const ownerId = String(grid?.creatorId || grid?.ownerId || grid?.owner || '');
      const adminIds = new Set<string>(
        (grid?.adminIds || grid?.adminList || []).map((x: any) => String(x?.uid || x))
      );

      const members = uids.map((uid) => {
        const role = uid === ownerId ? 'owner' : adminIds.has(uid) ? 'admin' : 'member';
        const strippedUid = uid.split('_')[0];
        const detail = detailMap.get(uid) || detailMap.get(strippedUid) || detailMap.get(`${strippedUid}_0`);
        const name = detail?.name || 'Unknown';
        const avatar = detail?.avatar || null;

        return {
          uid,
          name,
          displayName: name,
          avatar,
          role,
        };
      });

      // Query database fallback for any remaining 'Unknown' member names
      const unknownUids = members
        .filter(m => m.name === 'Unknown' && m.uid)
        .map(m => m.uid);

      if (unknownUids.length > 0) {
        const strippedUnknownUids = unknownUids.map(u => u.split('_')[0]);
        const allQueryUids = [...new Set([...unknownUids, ...strippedUnknownUids])];

        const [friends, contacts, accounts] = await Promise.all([
          prisma.friend.findMany({
            where: { zaloUidInNick: { in: allQueryUids } },
            select: { zaloUidInNick: true, aliasInNick: true, zaloDisplayName: true, zaloAvatarUrl: true },
          }),
          prisma.contact.findMany({
            where: { zaloUid: { in: allQueryUids } },
            select: { zaloUid: true, crmName: true, fullName: true, avatarUrl: true },
          }),
          prisma.zaloAccount.findMany({
            where: { zaloUid: { in: allQueryUids } },
            select: { zaloUid: true, displayName: true, avatarUrl: true },
          }),
        ]);

        const dbNameMap = new Map<string, { name: string; avatar: string | null }>();
        const setMap = (key: string, info: { name: string; avatar: string | null }) => {
          if (!key) return;
          const stripped = key.split('_')[0];
          dbNameMap.set(key, info);
          dbNameMap.set(stripped, info);
          dbNameMap.set(`${stripped}_0`, info);
        };

        for (const a of accounts) {
          if (a.zaloUid && a.displayName) {
            setMap(a.zaloUid, { name: a.displayName, avatar: a.avatarUrl || null });
          }
        }
        for (const c of contacts) {
          if (c.zaloUid) {
            const name = c.crmName || c.fullName;
            if (name) setMap(c.zaloUid, { name, avatar: c.avatarUrl || null });
          }
        }
        for (const f of friends) {
          const name = f.aliasInNick || f.zaloDisplayName;
          const fUid = f.zaloUidInNick;
          if (name && fUid) {
            setMap(fUid, { name, avatar: f.zaloAvatarUrl || null });
          }
        }

        for (const m of members) {
          if (m.name === 'Unknown' && m.uid) {
            const resolved = dbNameMap.get(m.uid) || dbNameMap.get(m.uid.split('_')[0]) || dbNameMap.get(`${m.uid.split('_')[0]}_0`);
            if (resolved) {
              m.name = resolved.name;
              m.displayName = resolved.name;
              if (!m.avatar) m.avatar = resolved.avatar;
            }
          }
        }
      }

      return { members };
    } catch (err) { return handleError(reply, err, 'getGroupMembersInfo'); }
  });

  // ── Group CRUD ──────────────────────────────────────────────────────────────

  app.post<{ Params: { accountId: string }; Body: { name: string; memberIds: string[] } }>(BASE, async (request, reply) => {
    const { accountId } = request.params;
    const { name, memberIds } = request.body ?? {};
    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      return reply.status(400).send({ error: 'name and memberIds are required' });
    }
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return reply.status(201).send({ group: await zaloOps.createGroup(accountId, { name, memberIds }) });
    } catch (err) { return handleError(reply, err, 'createGroup'); }
  });

  app.patch<{ Params: { accountId: string; groupId: string }; Body: { name: string } }>(`${BASE}/:groupId/name`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { name } = request.body ?? {};
    if (!name) return reply.status(400).send({ error: 'name is required' });
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.renameGroup(accountId, name, groupId) };
    } catch (err) { return handleError(reply, err, 'renameGroup'); }
  });

  app.patch<{ Params: { accountId: string; groupId: string }; Body: Record<string, unknown> }>(`${BASE}/:groupId/settings`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.updateGroupSettings(accountId, request.body ?? {}, groupId) };
    } catch (err) { return handleError(reply, err, 'updateGroupSettings'); }
  });

  // ── Membership ──────────────────────────────────────────────────────────────

  app.post<{ Params: { accountId: string; groupId: string }; Body: { userIds: string[] } }>(`${BASE}/:groupId/members`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { userIds } = request.body ?? {};
    if (!Array.isArray(userIds) || userIds.length === 0) return reply.status(400).send({ error: 'userIds array is required' });
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.addUserToGroup(accountId, userIds, groupId) };
    } catch (err) { return handleError(reply, err, 'addUserToGroup'); }
  });

  app.delete<{ Params: { accountId: string; groupId: string }; Body: { userIds: string[] } }>(`${BASE}/:groupId/members`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { userIds } = request.body ?? {};
    if (!Array.isArray(userIds) || userIds.length === 0) return reply.status(400).send({ error: 'userIds array is required' });
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.removeUserFromGroup(accountId, userIds, groupId) };
    } catch (err) { return handleError(reply, err, 'removeUserFromGroup'); }
  });

  app.post<{ Params: { accountId: string; groupId: string }; Body: { userId: string } }>(`${BASE}/:groupId/deputies`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { userId } = request.body ?? {};
    if (!userId) return reply.status(400).send({ error: 'userId is required' });
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.addGroupDeputy(accountId, userId, groupId) };
    } catch (err) { return handleError(reply, err, 'addGroupDeputy'); }
  });

  app.delete<{ Params: { accountId: string; groupId: string; userId: string } }>(`${BASE}/:groupId/deputies/:userId`, async (request, reply) => {
    const { accountId, groupId, userId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.removeGroupDeputy(accountId, userId, groupId) };
    } catch (err) { return handleError(reply, err, 'removeGroupDeputy'); }
  });

  app.post<{ Params: { accountId: string; groupId: string }; Body: { newOwnerId: string } }>(`${BASE}/:groupId/transfer`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { newOwnerId } = request.body ?? {};
    if (!newOwnerId) return reply.status(400).send({ error: 'newOwnerId is required' });
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.changeGroupOwner(accountId, newOwnerId, groupId) };
    } catch (err) { return handleError(reply, err, 'changeGroupOwner'); }
  });
}
