/**
 * group-moderation-routes.ts — Group moderation, links, lifecycle, and polls.
 * Routes: /api/v1/zalo-accounts/:accountId/groups/:groupId/...
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../auth/auth-middleware.js';
import { zaloOps, ZaloOpError } from '../../shared/zalo-operations.js';
import { resolveAccount, checkAccess, handleError } from './zalo-route-helpers.js';
import { prisma } from '../../shared/database/prisma-client.js';
import { logger } from '../../shared/utils/logger.js';
import { logActivity } from '../activity/activity-logger.js';

/** Format một Date thành chuỗi "HH:mm dd/MM/yyyy" theo giờ Việt Nam (UTC+7). */
function formatVNTime(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour12: false,
  }).format(date).replace(',', '');
}

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

      // 1. Try to resolve group ID (grid) using getGroupLinkInfo first
      let grid: string | null = null;
      try {
        const info: any = await zaloOps.getGroupLinkInfo(accountId, { link: `https://zalo.me/g/${cleanLinkId}` });
        grid = info?.groupId || info?.globalId || null;
      } catch (infoErr) {
        logger.warn('[groups] getGroupLinkInfo failed for join-link, trying fallback:', infoErr);
        try {
          const parseResult: any = await zaloOps.parseLink(accountId, `https://zalo.me/g/${cleanLinkId}`);
          grid = parseResult?.params?.grid || parseResult?.grid || parseResult?.groupId || null;
        } catch (parseErr) {
          logger.warn('[groups] parseLink fallback failed for join-link:', parseErr);
        }
      }

      // 2. If grid is found, verify actual membership via getAllGroups (authoritative joined-group list)
      if (grid) {
        let isReallyMember = false;
        try {
          const allGroupsResult: any = await zaloOps.getAllGroups(accountId);
          const gridInfoMap = allGroupsResult?.gridInfoMap || allGroupsResult || {};
          const joinedGroupIds = new Set(Object.keys(gridInfoMap));
          isReallyMember = joinedGroupIds.has(grid);
          logger.info(`[groups] membership check via getAllGroups: grid=${grid}, isReallyMember=${isReallyMember}, joinedCount=${joinedGroupIds.size}`);
        } catch (allGroupsErr) {
          logger.warn(`[groups] getAllGroups failed for membership check, assuming not member:`, allGroupsErr);
        }

        if (isReallyMember) {
          let groupName: string | null = null;
          let groupAvatarUrl: string | null = null;
          let groupMembersCount: number | null = null;
          try {
            const groupInfo = await zaloOps.getGroupInfo(accountId, grid);
            const resultInfo = (groupInfo as any)?.gridInfoMap?.[grid] || groupInfo;
            const members = (resultInfo as any)?.memVerList || (resultInfo as any)?.memList || (resultInfo as any)?.members;
            groupName = resultInfo?.name || null;
            groupAvatarUrl = resultInfo?.avt || resultInfo?.fullAvt || resultInfo?.avatar || null;
            groupMembersCount = Array.isArray(members) ? members.length : (resultInfo?.totalMember || null);
          } catch (groupInfoErr) {
            logger.warn(`[groups] Failed to fetch group info for grid=${grid}:`, groupInfoErr);
          }

          // Ensure group Contact record exists
          let groupContact = await prisma.contact.findFirst({
            where: { zaloUid: grid, orgId: request.user!.orgId },
            select: { id: true },
          });
          if (!groupContact) {
            groupContact = await prisma.contact.create({
              data: {
                id: randomUUID(),
                orgId: request.user!.orgId,
                zaloUid: grid,
                fullName: groupName || 'Nhóm Zalo',
                metadata: { isGroup: true },
              },
              select: { id: true },
            });
          }

          let existing = await prisma.conversation.findFirst({
            where: {
              zaloAccountId: accountId,
              externalThreadId: grid,
              threadType: 'group',
            },
            select: { id: true, contactId: true },
          });
          if (!existing) {
            existing = await prisma.conversation.create({
              data: {
                orgId: request.user!.orgId,
                zaloAccountId: accountId,
                contactId: groupContact.id,
                threadType: 'group',
                externalThreadId: grid,
                groupName,
                groupAvatarUrl,
                groupMembersCount,
                lastMessageAt: new Date(),
                unreadCount: 0,
                isReplied: false,
              },
              select: { id: true, contactId: true },
            });
          } else {
            await prisma.conversation.update({
              where: { id: existing.id },
              data: {
                groupName,
                groupAvatarUrl,
                groupMembersCount,
                contactId: existing.contactId || groupContact.id,
              },
            });
          }
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
        await zaloOps.joinGroupByLink(accountId, cleanLinkId);
      } catch (err: any) {
        if (err?.code === 178 || String(err?.message || '').includes('178')) {
          alreadyMember = true;
        } else {
          throw err;
        }
      }

      if (!finalGrid) {
        throw new ZaloOpError('Không thể xác định ID nhóm Zalo sau khi gia nhập', 'API_ERROR', 500);
      }

      // 4. Ensure conversation in database
      let groupName: string | null = null;
      let groupAvatarUrl: string | null = null;
      let groupMembersCount: number | null = null;
      try {
        const groupInfo = await zaloOps.getGroupInfo(accountId, finalGrid);
        const resultInfo = (groupInfo as any)?.gridInfoMap?.[finalGrid] || groupInfo;
        const members = (resultInfo as any)?.memVerList || (resultInfo as any)?.memList || (resultInfo as any)?.members;
        groupName = resultInfo?.name || null;
        groupAvatarUrl = resultInfo?.avt || resultInfo?.fullAvt || resultInfo?.avatar || null;
        groupMembersCount = Array.isArray(members) ? members.length : (resultInfo?.totalMember || null);
      } catch (groupInfoErr) {
        logger.warn(`[groups] Failed to fetch group info for grid=${finalGrid} after joining:`, groupInfoErr);
      }

      const joinedAt = new Date();

      // Ensure group Contact record exists
      let groupContact = await prisma.contact.findFirst({
        where: { zaloUid: finalGrid, orgId: request.user!.orgId },
        select: { id: true },
      });
      if (!groupContact) {
        groupContact = await prisma.contact.create({
          data: {
            id: randomUUID(),
            orgId: request.user!.orgId,
            zaloUid: finalGrid,
            fullName: groupName || 'Nhóm Zalo',
            metadata: { isGroup: true },
          },
          select: { id: true },
        });
      }

      let existingConv = await prisma.conversation.findFirst({
        where: {
          zaloAccountId: accountId,
          externalThreadId: finalGrid,
          threadType: 'group',
        },
        select: { id: true, contactId: true },
      });

      if (!existingConv) {
        existingConv = await prisma.conversation.create({
          data: {
            orgId: request.user!.orgId,
            zaloAccountId: accountId,
            contactId: groupContact.id,
            threadType: 'group',
            externalThreadId: finalGrid,
            groupName,
            groupAvatarUrl,
            groupMembersCount,
            groupJoinedAt: joinedAt,
            lastMessageAt: joinedAt,
            unreadCount: 0,
            isReplied: false,
          },
          select: { id: true, contactId: true },
        });
      } else {
        existingConv = await prisma.conversation.update({
          where: { id: existingConv.id },
          data: {
            groupName,
            groupAvatarUrl,
            groupMembersCount,
            groupJoinedAt: joinedAt,
            contactId: existingConv.contactId || groupContact.id,
          },
          select: { id: true, contactId: true },
        });
      }

      const userDetails = await prisma.user.findUnique({
        where: { id: request.user!.id },
        select: { fullName: true, email: true },
      });
      const userName = userDetails?.fullName || userDetails?.email || 'Hệ thống';

      // 5. Write join system message (same style as leave message)
      if (!alreadyMember) {
        try {
          const formattedTime = formatVNTime(joinedAt);
          const message = await prisma.message.create({
            data: {
              conversationId: existingConv.id,
              zaloMsgIdNum: BigInt(joinedAt.getTime()) * 10000n,
              senderType: 'system',
              contentType: 'system_event',
              content: `Đã tham gia nhóm bởi ${userName} vào ${formattedTime}`,
              sentVia: 'system',
              sentAt: joinedAt,
            },
          });

          if (existingConv.contactId) {
            void logActivity({
              orgId: request.user!.orgId,
              userId: request.user!.id,
              action: 'group_member_join',
              entityType: 'contact',
              entityId: existingConv.contactId,
              details: {
                userName,
              },
            });
          }
        } catch (msgErr) {
          logger.error('[groups] Failed to record system message after joining group:', msgErr);
        }
      }

      // 6. Send welcome message if requested and we weren't already a member
      if (welcomeMessage && welcomeMessage.trim() && !alreadyMember) {
        try {
          const sendResult = await zaloOps.sendMessage(accountId, finalGrid, 1, { msg: welcomeMessage.trim() });
          const sr = sendResult as any;
          const rawId = sr?.message?.msgId ?? sr?.attachment?.[0]?.msgId ?? '';
          const zaloMsgId = String(rawId || '');
          const zaloMsgIdNum = zaloMsgId && /^\d+$/.test(zaloMsgId) ? BigInt(zaloMsgId) : null;

          // Save the outgoing message to the database immediately, attributing it to the CRM user who triggered it (repliedByUserId).
          // This ensures that when Zalo sends the message echo webhook, it is matched and the sender name displays the correct sale.
          await prisma.message.create({
            data: {
              id: randomUUID(),
              conversationId: existingConv.id,
              zaloMsgId: zaloMsgId || null,
              zaloMsgIdNum: zaloMsgIdNum,
              senderType: 'self',
              senderUid: accountId,
              senderName: userName,
              content: welcomeMessage.trim(),
              contentType: 'text',
              sentAt: new Date(),
              sentVia: 'user',
              repliedByUserId: request.user!.id,
              metadata: {
                sender: {
                  kind: 'user_crm',
                  name: userName
                }
              }
            }
          });
        } catch (msgErr) {
          logger.error('[groups] Failed to send welcome message and save to CRM after joining:', msgErr);
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
      if (!(await checkAccess(request, reply, accountId, 'chat'))) return;
      const result = await zaloOps.leaveGroup(accountId, groupId, silent !== false);

      try {
        const conversation = await prisma.conversation.findFirst({
          where: {
            zaloAccountId: accountId,
            externalThreadId: groupId,
            threadType: 'group',
          },
          select: { id: true, contactId: true },
        });
        if (conversation) {
          const userDetails = await prisma.user.findUnique({
            where: { id: request.user!.id },
            select: { fullName: true, email: true },
          });
          const userName = userDetails?.fullName || userDetails?.email || 'Hệ thống';

          const now = new Date();
          const formattedTime = formatVNTime(now);
          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              zaloMsgIdNum: BigInt(now.getTime()) * 10000n,
              senderType: 'system',
              contentType: 'system_event',
              content: `Đã rời nhóm bởi ${userName} vào ${formattedTime}`,
              sentVia: 'system',
              sentAt: now,
            },
          });

          if (conversation.contactId) {
            void logActivity({
              orgId: request.user!.orgId,
              userId: request.user!.id,
              action: 'group_member_leave',
              entityType: 'contact',
              entityId: conversation.contactId,
              details: {
                userName,
              },
            });
          }

          const io = (app as any).io;
          io?.emit('chat:message', {
            accountId,
            message: {
              ...message,
              zaloMsgIdNum: message.zaloMsgIdNum?.toString(),
            },
            conversationId: conversation.id,
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
