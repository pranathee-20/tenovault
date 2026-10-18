/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/postgresAdapter.js';
import { tenantGuardAuth, requireRole } from '../middleware/tenantGuard.js';

const router = Router();

router.use(tenantGuardAuth);

/**
 * GET /api/anomalies
 * Scans recent audit events for deterministic threat patterns
 */
router.get('/', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.tenantId!;
  const alerts = await db.getSuspiciousAlerts(tenantId);

  res.status(200).json({
    alerts,
    tenantId,
    total: alerts.length,
    detectorEngine: 'TENOVAULT Deterministic Threat Heuristic Engine v2.4 (Simulated Rules)',
    ruleSetVersion: '2026.10',
    requestId: req.requestId
  });
});

/**
 * POST /api/anomalies/dismiss
 * Dismisses an alert
 */
router.post('/dismiss', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { alertId } = req.body;
  if (alertId && db.dismissAlert) {
    await db.dismissAlert(alertId);
  }
  res.status(200).json({ success: true, message: 'Alert acknowledged and dismissed' });
});

export default router;
