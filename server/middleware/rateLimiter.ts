/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { getClientIp, recordAuditSafely } from './tenantGuard.js';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const memoryLimitStore = new Map<string, RateLimitBucket>();

/**
 * In-memory sliding window rate limiter
 */
export function createRateLimiter(options: { maxRequests: number; windowMs: number; endpointName: string }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIp(req);
    const key = `${options.endpointName}:${ip}`;
    const now = Date.now();

    const bucket = memoryLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
      memoryLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.maxRequests) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      await recordAuditSafely({
        requestId: (req.headers['x-request-id'] as string) || `req-ratelimit-${now}`,
        tenantId: req.tenantId || 'unauthenticated',
        actorUserId: req.user?.id || 'anonymous',
        actorEmail: req.user?.email || 'anonymous',
        actorRole: req.user?.role || 'unauthenticated',
        action: 'AUTH_LOGIN',
        resourceType: 'system',
        resourceId: options.endpointName,
        decision: 'DENIED',
        denialReasonCode: 'RATE_LIMIT_EXCEEDED',
        safeDetail: `Rate limit threshold exceeded (${options.maxRequests} req / ${options.windowMs / 1000}s) from IP ${ip}`,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'WARNING'
      });

      res.status(429).json({
        error: 'Too many requests. Please wait before retrying.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter
      });
      return;
    }

    next();
  };
}
