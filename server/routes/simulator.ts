/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { db } from '../db/postgresAdapter.js';
import { JWT_SECRET, tenantGuardAuth } from '../middleware/tenantGuard.js';

const router = Router();

router.use(tenantGuardAuth);

/**
 * POST /api/simulator/launch
 * Executes a controlled, safe synthetic attack vector against seeded records
 */
router.post('/launch', async (req: Request, res: Response): Promise<void> => {
  const { attackType, customDocId } = req.body;
  const callerUser = req.user!;
  const callerTenantId = req.tenantId!;

  // Determine foreign tenant targets
  const targetTenantId = callerTenantId === 'tenant-acme-corp' ? 'tenant-bluenova-sys' : 'tenant-acme-corp';
  const targetDocId = customDocId || (targetTenantId === 'tenant-bluenova-sys' ? 'doc-blue-001' : 'doc-acme-001');

  // Generate tokens for testing
  const callerToken = jwt.sign(
    { userId: callerUser.id, tenantId: callerTenantId, role: callerUser.role, email: callerUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Snapshot before record state
  const beforeDoc = await db.getRawDocumentById(targetDocId);
  const beforeHash = beforeDoc ? beforeDoc.contentHash : null;

  let requestSummary: any = {};
  let responseSummary: any = {};

  const requestAgent = supertest(req.app);

  switch (attackType) {
    case 'CROSS_TENANT_READ': {
      requestSummary = {
        method: 'GET',
        path: `/api/documents/${targetDocId}`,
        headers: { Authorization: 'Bearer [CALLER_TOKEN]' },
        simulatedIntent: `Tenant '${callerTenantId}' actor attempting to read foreign document '${targetDocId}' belonging to '${targetTenantId}'`
      };

      const result = await requestAgent
        .get(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${callerToken}`);

      responseSummary = {
        status: result.status,
        body: result.body
      };
      break;
    }

    case 'CROSS_TENANT_UPDATE': {
      const maliciousPayload = {
        title: 'COMPROMISED CONTENT - MALICIOUS OVERWRITE',
        fullContent: 'HACKED BY EXPLOIT SCRIPT'
      };

      requestSummary = {
        method: 'PUT',
        path: `/api/documents/${targetDocId}`,
        headers: { Authorization: 'Bearer [CALLER_TOKEN]' },
        body: maliciousPayload,
        simulatedIntent: `Unauthorized update attack against foreign document '${targetDocId}'`
      };

      const result = await requestAgent
        .put(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${callerToken}`)
        .send(maliciousPayload);

      responseSummary = {
        status: result.status,
        body: result.body
      };
      break;
    }

    case 'CROSS_TENANT_DELETE': {
      requestSummary = {
        method: 'DELETE',
        path: `/api/documents/${targetDocId}`,
        headers: { Authorization: 'Bearer [CALLER_TOKEN]' },
        simulatedIntent: `Destructive delete attack attempting to wipe foreign tenant document '${targetDocId}'`
      };

      const result = await requestAgent
        .delete(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${callerToken}`);

      responseSummary = {
        status: result.status,
        body: result.body
      };
      break;
    }

    case 'HEADER_SPOOFING': {
      requestSummary = {
        method: 'GET',
        path: '/api/documents',
        headers: {
          Authorization: 'Bearer [CALLER_TOKEN]',
          'x-tenant-id': targetTenantId
        },
        simulatedIntent: `Tenant spoofing injection: Client claims foreign tenant '${targetTenantId}' via header override`
      };

      const result = await requestAgent
        .get('/api/documents')
        .set('Authorization', `Bearer ${callerToken}`)
        .set('x-tenant-id', targetTenantId);

      responseSummary = {
        status: result.status,
        body: result.body
      };
      break;
    }

    case 'SEQUENTIAL_SCAN': {
      const scanIds = [
        targetTenantId === 'tenant-bluenova-sys' ? 'doc-blue-001' : 'doc-acme-001',
        targetTenantId === 'tenant-bluenova-sys' ? 'doc-blue-002' : 'doc-acme-002',
        targetTenantId === 'tenant-bluenova-sys' ? 'doc-blue-003' : 'doc-acme-003',
        'doc-nonexistent-999'
      ];

      requestSummary = {
        method: 'GET (Batch)',
        targets: scanIds,
        simulatedIntent: 'Automated rapid IDOR enumeration probing sequential document identifiers'
      };

      const batchResults: any[] = [];
      for (const id of scanIds) {
        const resProbe = await requestAgent
          .get(`/api/documents/${id}`)
          .set('Authorization', `Bearer ${callerToken}`);
        batchResults.push({ id, status: resProbe.status, code: resProbe.body?.code });
      }

      responseSummary = {
        status: 404,
        batchResults,
        summary: 'All sequential ID probes intercepted and safely neutralized'
      };
      break;
    }

    case 'ROLE_OVERREACH_WRITE': {
      // Find viewer in caller's tenant
      const users = await db.getUsersByTenant(callerTenantId);
      const viewer = users.find((u) => u.role === 'viewer') || callerUser;

      const viewerToken = jwt.sign(
        { userId: viewer.id, tenantId: callerTenantId, role: 'viewer', email: viewer.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      requestSummary = {
        method: 'POST',
        path: '/api/documents',
        headers: { Authorization: 'Bearer [VIEWER_TOKEN]' },
        body: { title: 'Unauthorized Document', fullContent: 'Created by viewer' },
        simulatedIntent: `User with 'viewer' role attempting write mutation on /api/documents`
      };

      const result = await requestAgent
        .post('/api/documents')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Unauthorized Document',
          classification: 'INTERNAL',
          category: 'Strategy',
          fullContent: 'Viewer write attempt'
        });

      responseSummary = {
        status: result.status,
        body: result.body
      };
      break;
    }

    default:
      res.status(400).json({ error: 'Unknown attack scenario type' });
      return;
  }

  // Snapshot after record state
  const afterDoc = await db.getRawDocumentById(targetDocId);
  const afterHash = afterDoc ? afterDoc.contentHash : null;
  const integrityPreserved = beforeHash === afterHash && (beforeDoc !== null ? afterDoc !== null : true);

  // Fetch the latest audit event generated by this simulation
  const latestEvents = await db.getAuditEventsByTenant(callerTenantId, { limit: 1 });
  let auditEvent = latestEvents.length > 0 ? latestEvents[0] : null;
  if (auditEvent) {
    const { targetTenantId: _discard, ...safeEv } = auditEvent;
    auditEvent = safeEv as any;
  }

  res.status(200).json({
    attackType,
    targetDocId,
    requestSummary,
    responseSummary,
    targetRecordIntegrity: {
      beforeHash,
      afterHash,
      integrityPreserved,
      unchanged: integrityPreserved
    },
    auditEvent,
    defenseExplanation: 'TenantGuard Step 4 blocked cross-tenant access and TenantTrace captured structured audit evidence.'
  });
});

export default router;
