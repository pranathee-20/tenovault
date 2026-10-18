/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/postgresAdapter.js';
import { JWT_SECRET, tenantGuardAuth, recordAuditSafely, getClientIp } from '../middleware/tenantGuard.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Protect login endpoint against brute force
const loginRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  endpointName: 'auth_login'
});

/**
 * POST /api/auth/login
 * Validates credentials, checks user, signs JWT with tenantId & role claims, records audit log
 */
router.post('/login', loginRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const requestId = (req.headers['x-request-id'] as string) || `req-login-${Date.now().toString(36)}`;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required', code: 'INVALID_PAYLOAD' });
    return;
  }

  const user = await db.getUserByEmail(email.trim());

  if (!user) {
    await recordAuditSafely({
      requestId,
      tenantId: 'unauthenticated',
      actorUserId: 'unknown',
      actorEmail: email.trim(),
      actorRole: 'unauthenticated',
      action: 'AUTH_LOGIN',
      resourceType: 'session',
      resourceId: 'login-attempt',
      decision: 'DENIED',
      denialReasonCode: 'AUTH_INVALID_TOKEN',
      safeDetail: `Authentication failed: User account not found for '${email.trim()}'`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'WARNING'
    });

    res.status(401).json({ error: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS', requestId });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    await recordAuditSafely({
      requestId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'AUTH_LOGIN',
      resourceType: 'session',
      resourceId: user.id,
      decision: 'DENIED',
      denialReasonCode: 'AUTH_INVALID_TOKEN',
      safeDetail: `Authentication failed: Invalid password supplied for '${user.email}'`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'WARNING'
    });

    res.status(401).json({ error: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS', requestId });
    return;
  }

  // Issue short-lived secure JWT with verified claims
  const tokenPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '8h',
    algorithm: 'HS256'
  });

  const tenant = await db.getTenantById(user.tenantId);

  // Record ALLOWED audit event
  await recordAuditSafely({
    requestId,
    tenantId: user.tenantId,
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'AUTH_LOGIN',
    resourceType: 'session',
    resourceId: `session-${user.id}`,
    decision: 'ALLOWED',
    safeDetail: `User '${user.name}' successfully authenticated with role '${user.role}' in tenant '${tenant?.name}'`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'INFO'
  });

  const { passwordHash: _, ...safeUser } = user;

  res.status(200).json({
    token,
    user: safeUser,
    tenant,
    requestId
  });
});

/**
 * GET /api/auth/me
 * Returns currently authenticated user and active tenant
 */
router.get('/me', tenantGuardAuth, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const tenant = await db.getTenantById(req.tenantId!);

  res.status(200).json({
    user,
    tenant,
    dbStatus: db.getConnectionInfo(),
    requestId: req.requestId
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', tenantGuardAuth, async (req: Request, res: Response): Promise<void> => {
  if (req.user && req.tenantId) {
    await recordAuditSafely({
      requestId: req.requestId || `req-logout-${Date.now()}`,
      tenantId: req.tenantId,
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'AUTH_LOGOUT',
      resourceType: 'session',
      resourceId: `session-${req.user.id}`,
      decision: 'ALLOWED',
      safeDetail: `User '${req.user.name}' signed out of tenant session`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'INFO'
    });
  }

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/demo-accounts
 * Safe development helper listing synthetic accounts and their roles
 */
router.get('/demo-accounts', async (_req: Request, res: Response): Promise<void> => {
  if (process.env.DEMO_MODE !== 'true') {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
    return;
  }

  const tenants = await db.getAllTenants();
  const accountsByTenant: Record<string, any> = {};

  for (const tenant of tenants) {
    const users = await db.getUsersByTenant(tenant.id);
    accountsByTenant[tenant.id] = {
      tenant,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        department: u.department,
        demoPassword: 'DemoSafe!2026'
      }))
    };
  }

  res.status(200).json({
    message: 'Synthetic development accounts for multitenant testing only',
    accountsByTenant,
    systemNote: 'All accounts utilize isolated synthetic data. No real personal records.'
  });
});

export default router;
