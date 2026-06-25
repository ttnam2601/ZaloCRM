/**
 * group-moderation-routes.ts — Group moderation, links, lifecycle, and polls.
 * Routes: /api/v1/zalo-accounts/:accountId/groups/:groupId/...
 */
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth-middleware.js';
import { zaloOps } from '../../shared/zalo-operations.js';
import { resolveAccount, checkAccess, handleError } from './zalo-route-helpers.js';
import { prisma } from '../../shared/database/prisma-client.js';
import { logger } from '../../shared/utils/logger.js';

export async function groupModerationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  const BASE = '/api/v1/zalo-accounts/:accountId/groups';

  // ── Moderation ──────────────────────────────────────────────────────────────

  app.post<{ Params: { accountId: string; groupId: string }; Body: { userId: string } }>(`${BASE}/:groupId/block`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { userId } = request.body ?? {};
    if (!userId) return reply.status(400).send({ error: 'userId is required' });
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.blockGroupMember(accountId, userId, groupId) };
    } catch (err) { return handleError(reply, err, 'blockGroupMember'); }
  });

  app.delete<{ Params: { accountId: string; groupId: string; userId: string } }>(`${BASE}/:groupId/block/:userId`, async (request, reply) => {
    const { accountId, groupId, userId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.unblockGroupMember(accountId, userId, groupId) };
    } catch (err) { return handleError(reply, err, 'unblockGroupMember'); }
  });

  app.get<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId/blocked`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;
      return { blocked: await zaloOps.getGroupBlockedMembers(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'getGroupBlockedMembers'); }
  });

  app.get<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId/pending`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;
      return { pending: await zaloOps.getPendingGroupMembers(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'getPendingGroupMembers'); }
  });

  // ── Links ───────────────────────────────────────────────────────────────────

  app.get<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId/link`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;
      return { link: await zaloOps.getGroupLinkDetail(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'getGroupLinkDetail'); }
  });

  app.post<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId/link/enable`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.enableGroupLink(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'enableGroupLink'); }
  });

  app.post<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId/link/disable`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.disableGroupLink(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'disableGroupLink'); }
  });

  app.post<{ Params: { accountId: string }; Body: { linkId: string; welcomeMessage?: string; checkOnly?: boolean } }>(`/api/v1/zalo-accounts/:accountId/groups/join-link`, async (request, reply) => {
    const { accountId } = request.params;
    const { linkId, welcomeMessage, checkOnly } = request.body ?? {};
    if (!linkId) return reply.status(400).send({ error: 'linkId is required' });

    let cleanLinkId = linkId.trim();
    if (cleanLinkId.includes('?')) {
      cleanLinkId = cleanLinkId.split('?')[0];
    }
    if (cleanLinkId.includes('/')) {
      cleanLinkId = cleanLinkId.split('/').pop() || cleanLinkId;
    }

    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'chat'))) return;

      // 1. Try to resolve group ID (grid) using parseLink first to see if already in group
      let grid: string | null = null;
      try {
        const parseResult: any = await zaloOps.parseLink(accountId, `https://zalo.me/g/${cleanLinkId}`);
        grid = parseResult?.params?.grid || parseResult?.grid || parseResult?.groupId || null;
      } catch (parseErr) {
        logger.warn('[groups] parseLink failed for join-link:', parseErr);
      }

      // 2. If grid is found, check if a conversation already exists in DB
      if (grid) {
        const existing = await prisma.conversation.findFirst({
          where: {
            zaloAccountId: accountId,
            externalThreadId: grid,
            threadType: 'group',
          },
          select: { id: true },
        });
        if (existing) {
          return { conversationId: existing.id, alreadyMember: true, groupId: grid };
        }
      }

      if (checkOnly) {
        return { alreadyMember: false, groupId: grid };
      }

      // 3. Perform join link call
      let finalGrid = grid;
      let alreadyMember = false;
      try {
        const joinResult: any = await zaloOps.joinGroupByLink(accountId, cleanLinkId);
        finalGrid = finalGrid || joinResult?.grid || joinResult?.groupId;
      } catch (err: any) {
        if (err?.code === 178 || String(err?.message || '').includes('178')) {
          alreadyMember = true;
        } else {
          throw err;
        }
      }

      if (!finalGrid) {
        throw new Error('Could not resolve Zalo group ID');
      }

      // 4. Ensure conversation in database
      let existingConv = await prisma.conversation.findFirst({
        where: {
          zaloAccountId: accountId,
          externalThreadId: finalGrid,
          threadType: 'group',
        },
        select: { id: true },
      });

      if (!existingConv) {
        existingConv = await prisma.conversation.create({
          data: {
            orgId: request.user!.orgId,
            zaloAccountId: accountId,
            contactId: null,
            threadType: 'group',
            externalThreadId: finalGrid,
            lastMessageAt: new Date(),
            unreadCount: 0,
            isReplied: false,
          },
          select: { id: true },
        });
      }

      // 5. Send welcome message if requested and we weren't already a member
      if (welcomeMessage && welcomeMessage.trim() && !alreadyMember) {
        try {
          await zaloOps.sendMessage(accountId, finalGrid, 1, { msg: welcomeMessage.trim() });
        } catch (msgErr) {
          logger.error('[groups] Failed to send welcome message after joining:', msgErr);
        }
      }

      return { conversationId: existingConv.id, groupId: finalGrid, alreadyMember };
    } catch (err) { return handleError(reply, err, 'joinGroupByLink'); }
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  app.post<{ Params: { accountId: string; groupId: string }; Body: { silent?: boolean } }>(`${BASE}/:groupId/leave`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { silent } = request.body ?? {};
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      const result = await zaloOps.leaveGroup(accountId, groupId, silent !== false);

      try {
        const conversation = await prisma.conversation.findFirst({
          where: {
            zaloAccountId: accountId,
            externalThreadId: groupId,
            threadType: 'group',
          },
          select: { id: true },
        });
        if (conversation) {
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const formattedTime = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderType: 'system',
              contentType: 'system_event',
              content: `Đã rời nhóm vào ${formattedTime}`,
              sentVia: 'system',
              sentAt: now,
            },
          });
        }
      } catch (dbErr) {
        logger.error('[groups] Failed to record system message after leaving group:', dbErr);
      }

      return { result };
    } catch (err) { return handleError(reply, err, 'leaveGroup'); }
  });

  app.post<{ Params: { accountId: string; groupId: string } }>(`${BASE}/:groupId/disperse`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.disperseGroup(accountId, groupId) };
    } catch (err) { return handleError(reply, err, 'disperseGroup'); }
  });

  // ── Polls ───────────────────────────────────────────────────────────────────

  app.post<{
    Params: { accountId: string; groupId: string };
    Body: { question: string; options: string[]; multi?: boolean; anonymous?: boolean; expireMs?: number };
  }>(`${BASE}/:groupId/polls`, async (request, reply) => {
    const { accountId, groupId } = request.params;
    const { question, options, multi, anonymous, expireMs } = request.body ?? {};
    if (!question || !Array.isArray(options) || options.length < 2) {
      return reply.status(400).send({ error: 'question and at least 2 options are required' });
    }
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      const pollOptions = { question, options, multi: multi ?? false, anonymous: anonymous ?? false, expireMs };
      return reply.status(201).send({ poll: await zaloOps.createPoll(accountId, pollOptions, groupId) });
    } catch (err) { return handleError(reply, err, 'createPoll'); }
  });

  app.get<{ Params: { accountId: string; groupId: string; pollId: string } }>(`${BASE}/:groupId/polls/:pollId`, async (request, reply) => {
    const { accountId, pollId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'read'))) return;
      return { poll: await zaloOps.getPollDetail(accountId, pollId) };
    } catch (err) { return handleError(reply, err, 'getPollDetail'); }
  });

  app.post<{
    Params: { accountId: string; groupId: string; pollId: string };
    Body: { optionIds: number[] };
  }>(`${BASE}/:groupId/polls/:pollId/vote`, async (request, reply) => {
    const { accountId, groupId, pollId } = request.params;
    const { optionIds } = request.body ?? {};
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return reply.status(400).send({ error: 'optionIds array is required' });
    }
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'chat'))) return;
      return { result: await zaloOps.votePoll(accountId, pollId, optionIds, groupId) };
    } catch (err) { return handleError(reply, err, 'votePoll'); }
  });

  app.post<{ Params: { accountId: string; groupId: string; pollId: string } }>(`${BASE}/:groupId/polls/:pollId/lock`, async (request, reply) => {
    const { accountId, pollId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'admin'))) return;
      return { result: await zaloOps.lockPoll(accountId, pollId) };
    } catch (err) { return handleError(reply, err, 'lockPoll'); }
  });

  app.post<{ Params: { accountId: string; groupId: string; pollId: string } }>(`${BASE}/:groupId/polls/:pollId/share`, async (request, reply) => {
    const { accountId, pollId } = request.params;
    try {
      await resolveAccount(accountId, request.user!.orgId);
      if (!(await checkAccess(request, reply, accountId, 'chat'))) return;
      return { result: await zaloOps.sharePoll(accountId, pollId) };
    } catch (err) { return handleError(reply, err, 'sharePoll'); }
  });
}
