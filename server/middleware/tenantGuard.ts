/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/postgresAdapter.js';
import { SafeUser, UserRole, DenialReasonCode, AuditAction } from '../types.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: SafeUser;
      tenantId?: string;
      auditDecisionLogged?: boolean;
    }
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'tenovault-super-secure-jwt-signing-secret-key-2026';

/**
 * TenantGuard Step 1 & 2:
 * 1. Authenticate Identity (verifies cryptographic signature, expiry, algorithm)
 * 2. Verify Tenant Membership against trusted server-side database records
 *
 * CRITICAL DEFENSE: Never trusts any client-supplied x-tenant-id, body tenantId, or query tenantId.
 */
export async function tenantGuardAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  req.requestId = requestId;

  // Check for Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Record audit denial
    await recordAuditSafely({
      requestId,
      tenantId: 'unauthenticated',
      actorUserId: 'anonymous',
      actorEmail: 'anonymous',
      actorRole: 'unauthenticated',
      action: inferActionFromRoute(req),
      resourceType: inferResourceType(req),
      resourceId: (req.params.id as string) || req.path,
      decision: 'DENIED',
      denialReasonCode: 'AUTH_NO_TOKEN',
      safeDetail: 'Authentication failed: Missing or malformed Bearer authorization token',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'WARNING'
    });

    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_NO_TOKEN',
      requestId
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err: any) {
    const reason: DenialReasonCode = err.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_INVALID_TOKEN';
    await recordAuditSafely({
      requestId,
      tenantId: 'unauthenticated',
      actorUserId: 'anonymous',
      actorEmail: 'anonymous',
      actorRole: 'unauthenticated',
      action: inferActionFromRoute(req),
      resourceType: inferResourceType(req),
      resourceId: (req.params.id as string) || req.path,
      decision: 'DENIED',
      denialReasonCode: reason,
      safeDetail: `Authentication failed: ${err.message || 'Invalid signature or token structure'}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'WARNING'
    });

    res.status(401).json({
      error: 'Invalid or expired authentication credentials',
      code: reason,
      requestId
    });
    return;
  }

  // Step 2: Validate user existence and trusted server-side tenant membership
  if (!decoded.userId || !decoded.tenantId) {
    res.status(401).json({
      error: 'Invalid token payload',
      code: 'AUTH_INVALID_TOKEN',
      requestId
    });
    return;
  }

  const user = await db.getUserById(decoded.userId);
  if (!user) {
    res.status(401).json({
      error: 'User account not found or deactivated',
      code: 'AUTH_INVALID_TOKEN',
      requestId
    });
    return;
  }

  // Strict verification: Does user's database tenant match the token tenant?
  if (user.tenantId !== decoded.tenantId) {
    await recordAuditSafely({
      requestId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: inferActionFromRoute(req),
      resourceType: inferResourceType(req),
      resourceId: (req.params.id as string) || req.path,
      decision: 'DENIED',
      denialReasonCode: 'TENANT_MEMBERSHIP_MISMATCH',
      safeDetail: 'Security mismatch: User tenant in database does not match claims in token',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'CRITICAL'
    });

    res.status(403).json({
      error: 'Tenant authorization mismatch',
      code: 'TENANT_MEMBERSHIP_MISMATCH',
      requestId
    });
    return;
  }

  // Check if client attempted to inject or spoof a different tenant via headers
  const spoofedTenantHeader = req.headers['x-tenant-id'] || req.headers['x-target-tenant'];
  if (spoofedTenantHeader && spoofedTenantHeader !== user.tenantId) {
    // Audit warning: client tried to spoof tenant, but TenantGuard overrides it with verified tenant!
    await recordAuditSafely({
      requestId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: inferActionFromRoute(req),
      resourceType: inferResourceType(req),
      resourceId: (req.params.id as string) || req.path,
      targetTenantId: String(spoofedTenantHeader),
      decision: 'DENIED',
      denialReasonCode: 'SPOOFED_TENANT_HEADER_IGNORED',
      safeDetail: `Blocked untrusted tenant spoofing attempt: header '${spoofedTenantHeader}' rejected in favor of verified tenant '${user.tenantId}'`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'WARNING'
    });
    // We deny request when deliberate spoofing attack header is detected
    res.status(403).json({
      error: 'Client tenant header mismatch: Cross-tenant context injection rejected',
      code: 'SPOOFED_TENANT_HEADER_IGNORED',
      requestId
    });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;
  req.user = safeUser;
  // Non-negotiable: trusted tenant ID derived solely from verified server record
  req.tenantId = user.tenantId;

  next();
}

/**
 * TenantGuard Step 3: Verify Role Permission
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.tenantId) {
      res.status(401).json({ error: 'Unauthenticated', code: 'AUTH_NO_TOKEN' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      const action = inferActionFromRoute(req);
      await recordAuditSafely({
        requestId: req.requestId || 'req-unknown',
        tenantId: req.tenantId,
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action,
        resourceType: inferResourceType(req),
        resourceId: (req.params.id as string) || req.path,
        decision: 'DENIED',
        denialReasonCode: 'ROLE_PERMISSION_DENIED',
        safeDetail: `Role '${req.user.role}' lacks permission for '${req.method} ${req.baseUrl}${req.path}'. Required: [${allowedRoles.join(', ')}]`,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'WARNING'
      });

      res.status(403).json({
        error: 'Forbidden: Insufficient role permissions for this action',
        code: 'ROLE_PERMISSION_DENIED',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        requestId: req.requestId
      });
      return;
    }

    next();
  };
}

/**
 * TenantGuard Step 4: Verify Target Resource Ownership
 * Checks if the target resource exists and belongs to the authenticated tenant.
 * If the resource belongs to another tenant or does not exist, returns safe 404/403.
 */
export async function verifyResourceOwnership(
  req: Request,
  res: Response,
  targetResourceId: string,
  action: AuditAction
): Promise<boolean> {
  const callerTenantId = req.tenantId!;
  const rawDoc = await db.getRawDocumentById(targetResourceId);

  // If document does not exist at all:
  if (!rawDoc) {
    await recordAuditSafely({
      requestId: req.requestId || 'req-unknown',
      tenantId: callerTenantId,
      actorUserId: req.user?.id || 'unknown',
      actorEmail: req.user?.email || 'unknown',
      actorRole: req.user?.role || 'viewer',
      action,
      resourceType: 'document',
      resourceId: targetResourceId,
      decision: 'DENIED',
      denialReasonCode: 'RESOURCE_NOT_FOUND',
      safeDetail: 'Target resource not found in workspace',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'INFO'
    });

    res.status(404).json({
      error: 'Document not found or access denied',
      code: 'RESOURCE_NOT_FOUND',
      requestId: req.requestId
    });
    return false;
  }

  // Cross-tenant breach attempt: Document belongs to a DIFFERENT tenant!
  if (rawDoc.tenantId !== callerTenantId) {
    await recordAuditSafely({
      requestId: req.requestId || 'req-unknown',
      tenantId: callerTenantId, // Log under caller tenant's audit trail
      actorUserId: req.user?.id || 'unknown',
      actorEmail: req.user?.email || 'unknown',
      actorRole: req.user?.role || 'viewer',
      action,
      resourceType: 'document',
      resourceId: targetResourceId,
      targetTenantId: rawDoc.tenantId, // Document owner's tenant
      decision: 'DENIED',
      denialReasonCode: 'CROSS_TENANT_RESOURCE_ACCESS_DENIED',
      safeDetail: `Cross-tenant isolation enforced: Actor from tenant '${callerTenantId}' blocked from accessing resource '${targetResourceId}' owned by tenant '${rawDoc.tenantId}'`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'CRITICAL'
    });

    // Also write an alert audit log to the victim tenant's audit trail so victim admin is alerted
    await recordAuditSafely({
      requestId: req.requestId || 'req-unknown',
      tenantId: rawDoc.tenantId,
      actorUserId: `external-${req.user?.id}`,
      actorEmail: req.user?.email || 'external-actor',
      actorRole: 'unauthenticated',
      action,
      resourceType: 'document',
      resourceId: targetResourceId,
      decision: 'DENIED',
      denialReasonCode: 'CROSS_TENANT_RESOURCE_ACCESS_DENIED',
      safeDetail: `Inbound cross-tenant breach attempt intercepted: external user (${req.user?.email}) from tenant '${callerTenantId}' blocked from ${action}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'CRITICAL'
    });

    // SAFE RESPONSE: Return 404 (or safe 403) so client cannot confirm whether resource exists
    res.status(404).json({
      error: 'Document not found or access denied',
      code: 'CROSS_TENANT_RESOURCE_ACCESS_DENIED',
      requestId: req.requestId
    });
    return false;
  }

  return true;
}

/**
 * TenantTrace Helper: Safe logging that catches errors and never throws
 */
export async function recordAuditSafely(data: Parameters<typeof db.createAuditEvent>[0]): Promise<void> {
  try {
    await db.createAuditEvent(data);
  } catch (err) {
    console.error('[TenantTrace] CRITICAL: Audit log persistence failure:', err);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function inferActionFromRoute(req: Request): AuditAction {
  const method = req.method.toUpperCase();
  const path = req.path;

  if (path.includes('/auth/login')) return 'AUTH_LOGIN';
  if (path.includes('/auth/logout')) return 'AUTH_LOGOUT';
  if (path.includes('/audit')) return 'AUDIT_VIEW';
  if (path.includes('/users')) return 'USER_READ';

  if (method === 'GET' && req.params.id) return 'DOCUMENT_READ';
  if (method === 'GET') return 'DOCUMENT_LIST';
  if (method === 'POST') return 'DOCUMENT_CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'DOCUMENT_UPDATE';
  if (method === 'DELETE') return 'DOCUMENT_DELETE';

  return 'DOCUMENT_READ';
}

function inferResourceType(req: Request): 'document' | 'user' | 'audit_event' | 'session' | 'system' {
  const path = req.path;
  if (path.includes('/documents')) return 'document';
  if (path.includes('/audit')) return 'audit_event';
  if (path.includes('/users')) return 'user';
  if (path.includes('/auth')) return 'session';
  return 'system';
}
