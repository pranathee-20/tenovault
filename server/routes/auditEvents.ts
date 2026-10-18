/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/postgresAdapter.js';
import { tenantGuardAuth, requireRole, recordAuditSafely, getClientIp } from '../middleware/tenantGuard.js';

const router = Router();

// Apply TenantGuard Step 1 & 2
router.use(tenantGuardAuth);

/**
 * GET /api/audit-events
 * Returns audit events strictly scoped to reviewer's authorized tenant.
 * Admin and Editor can review audit logs (Admin has full view).
 */
router.get('/', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.tenantId!;
  const { action, decision, severity, search, limit } = req.query;

  const events = await db.getAuditEventsByTenant(tenantId, {
    action: action as string | undefined,
    decision: decision as string | undefined,
    severity: severity as string | undefined,
    search: search as string | undefined,
    limit: limit ? parseInt(limit as string, 10) : 50
  });

  // Remove targetTenantId from API response to prevent target company leakage
  const safeEvents = events.map(({ targetTenantId: _discard, ...rest }) => rest);

  res.status(200).json({
    events: safeEvents,
    total: safeEvents.length,
    tenantId,
    requestId: req.requestId
  });
});

/**
 * GET /api/audit-events/export
 * Downloads audit events strictly scoped to reviewer's authorized tenant in CSV or JSON format.
 * Strictly verifies identity, tenant membership, and role permissions.
 */
router.get('/export', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.tenantId!;
  const format = (req.query.format as string)?.toLowerCase() === 'csv' ? 'csv' : 'json';
  const { action, decision, severity, search } = req.query;

  // STRICT TENANT BOUNDARY: Scoped exclusively to req.tenantId
  const events = await db.getAuditEventsByTenant(tenantId, {
    action: action as string | undefined,
    decision: decision as string | undefined,
    severity: severity as string | undefined,
    search: search as string | undefined,
    limit: 1000 // reasonable upper bound for download
  });

  // Record audit event for the export action itself
  await recordAuditSafely({
    requestId: req.requestId || 'req-export',
    tenantId,
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'AUDIT_EXPORT',
    resourceType: 'audit_event',
    resourceId: `export-${format}-${events.length}`,
    decision: 'ALLOWED',
    safeDetail: `Exported ${events.length} audit log entries in ${format.toUpperCase()} format strictly scoped to tenant '${tenantId}'`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'INFO'
  });

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tenovault-audit-${tenantId}-${timestampStr}.${format}`;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Helper to safely escape CSV values and prevent formula injection
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Neutralize spreadsheet formula injection (=, +, -, @)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Timestamp (UTC)',
      'Event ID',
      'Request ID',
      'Tenant ID',
      'Actor Email',
      'Actor Role',
      'Action',
      'Resource Type',
      'Resource ID',
      'Decision',
      'Denial Reason Code',
      'Safe Explanation',
      'Severity',
      'IP Address',
      'User Agent'
    ];

    const rows = events.map((ev) => [
      escapeCsv(ev.timestamp),
      escapeCsv(ev.id),
      escapeCsv(ev.requestId),
      escapeCsv(ev.tenantId),
      escapeCsv(ev.actorEmail),
      escapeCsv(ev.actorRole),
      escapeCsv(ev.action),
      escapeCsv(ev.resourceType),
      escapeCsv(ev.resourceId),
      escapeCsv(ev.decision),
      escapeCsv(ev.denialReasonCode || ''),
      escapeCsv(ev.safeDetail),
      escapeCsv(ev.severity),
      escapeCsv(ev.ipAddress),
      escapeCsv(ev.userAgent)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    res.status(200).send(csvContent);
    return;
  }

  // JSON export (anonymized: targetTenantId stripped)
  const safeEvents = events.map(({ targetTenantId: _discard, ...rest }) => rest);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(
    JSON.stringify(
      {
        exportMetadata: {
          system: 'TENOVAULT Security Traceability Export',
          tenantId,
          exportedBy: req.user!.email,
          exportedAt: new Date().toISOString(),
          recordCount: safeEvents.length,
          format: 'JSON',
          isolationEnforced: true
        },
        events: safeEvents
      },
      null,
      2
    )
  );
});

/**
 * GET /api/audit-events/stats
 * Aggregates decisions, reasons, and real 24h hourly timeline metrics for dashboard visual charts
 */
router.get('/stats', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.tenantId!;
  const allEvents = await db.getAuditEventsByTenant(tenantId, { limit: 5000 });

  let allowedCount = 0;
  let deniedCount = 0;
  const reasonBreakdown: Record<string, number> = {};
  const actionBreakdown: Record<string, number> = {};

  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const hourlyMap: Record<string, { allowed: number; denied: number }> = {};

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 60 * 60 * 1000);
    const label = `${String(d.getHours()).padStart(2, '0')}:00`;
    hourlyMap[label] = { allowed: 0, denied: 0 };
  }

  allEvents.forEach((ev) => {
    if (ev.decision === 'ALLOWED') {
      allowedCount++;
    } else {
      deniedCount++;
      const code = ev.denialReasonCode || 'UNKNOWN';
      reasonBreakdown[code] = (reasonBreakdown[code] || 0) + 1;
    }
    actionBreakdown[ev.action] = (actionBreakdown[ev.action] || 0) + 1;

    const evTime = new Date(ev.timestamp).getTime();
    if (evTime >= twentyFourHoursAgo) {
      const d = new Date(ev.timestamp);
      const label = `${String(d.getHours()).padStart(2, '0')}:00`;
      if (hourlyMap[label]) {
        if (ev.decision === 'ALLOWED') hourlyMap[label].allowed++;
        else hourlyMap[label].denied++;
      }
    }
  });

  const timelineBuckets: { time: string; allowed: number; denied: number }[] = [];
  for (const [time, counts] of Object.entries(hourlyMap)) {
    timelineBuckets.push({ time, ...counts });
  }

  res.status(200).json({
    allowedCount,
    deniedCount,
    totalEvents: allEvents.length,
    reasonBreakdown,
    actionBreakdown,
    timelineBuckets,
    tenantId,
    requestId: req.requestId
  });
});

/**
 * GET /api/audit-events/:id
 * Retrieve single audit event detail. Enforces tenant boundary check.
 */
router.get('/:id', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const eventId = req.params.id;
  const event = await db.getAuditEventById(req.tenantId!, eventId);

  if (!event) {
    res.status(404).json({
      error: 'Audit event not found or access denied',
      code: 'RESOURCE_NOT_FOUND',
      requestId: req.requestId
    });
    return;
  }

  const { targetTenantId: _discard, ...safeEvent } = event;

  res.status(200).json({
    event: safeEvent,
    requestId: req.requestId
  });
});

export default router;
