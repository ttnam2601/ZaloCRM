/**
 * Auth middleware — verifies JWT on protected routes.
 * JWT user shape is defined in shared/types/fastify-jwt-user.d.ts.
 *
 * Phase Onboarding v1 2026-05-24 — check 'tv' claim vs user.jwtTokenVersion để revoke
 * JWT cũ sau khi đổi password / admin reset password. Token thiếu 'tv' (legacy) → bypass
 * check vì user.jwtTokenVersion = 0 default.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { enterTenantContext, runSystemQuery } from '../../shared/tenant/tenant-context.js';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const claim = request.user;
  if (claim?.id) {
    // Check token version — revoke JWT khi đổi password / admin reset.
    // Optimization: chỉ query DB nếu token có claim 'tv' (mới). Token cũ không có tv → skip.
    if (typeof claim.tv === 'number') {
      // runSystemQuery: lookup user để verify token chạy TRƯỚC khi có tenant
      // context → bypass tenant-guard hợp lệ (Phase 1a).
      const dbUser = await runSystemQuery(() =>
        prisma.user.findUnique({
          where: { id: claim.id },
          select: { jwtTokenVersion: true, isActive: true },
        }),
      );
      if (!dbUser || !dbUser.isActive) {
        return reply.status(401).send({ error: 'Tài khoản không tồn tại hoặc đã bị khoá', code: 'user_inactive' });
      }
      if (dbUser.jwtTokenVersion !== claim.tv) {
        return reply.status(401).send({ error: 'Session đã hết hạn, vui lòng đăng nhập lại', code: 'token_revoked' });
      }
    }

    // Phase 0 Gateway 2026-06-07 — set authCtx chuẩn hoá + enter ALS tenant context.
    // Mọi route nên đọc request.authCtx thay vì request.user.id/userId rải rác.
    // Phase 1 (tenant-guard + RLS) sẽ tự lấy orgId từ context này (chưa enforce ở Phase 0).
    request.authCtx = { userId: claim.id, orgId: claim.orgId, role: claim.role };
    enterTenantContext(request.authCtx);
  }
}
