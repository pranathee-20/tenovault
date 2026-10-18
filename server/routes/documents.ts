/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/postgresAdapter.js';
import {
  tenantGuardAuth,
  requireRole,
  verifyResourceOwnership,
  recordAuditSafely,
  getClientIp
} from '../middleware/tenantGuard.js';

const router = Router();

// Apply TenantGuard Step 1 & 2 (Authentication & Tenant Membership verification) to all document routes
router.use(tenantGuardAuth);

/**
 * GET /api/documents
 * List workspace documents. Strictly queries ONLY records belonging to req.tenantId.
 * Viewer, Editor, Admin all have read access.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.tenantId!;
  const searchQuery = req.query.q as string | undefined;

  const documents = await db.getDocumentsByTenant(tenantId, searchQuery);

  await recordAuditSafely({
    requestId: req.requestId || 'req-unknown',
    tenantId,
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: searchQuery ? 'DOCUMENT_SEARCH' : 'DOCUMENT_LIST',
    resourceType: 'document',
    resourceId: 'collection',
    decision: 'ALLOWED',
    safeDetail: `Returned ${documents.length} workspace document(s) strictly filtered by tenant boundary`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'INFO'
  });

  res.status(200).json({
    documents,
    total: documents.length,
    tenantId,
    requestId: req.requestId
  });
});

/**
 * GET /api/documents/:id
 * Retrieve single document by ID.
 * TenantGuard Step 4: verifies ownership by authenticated tenant.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const docId = req.params.id;
  const isOwner = await verifyResourceOwnership(req, res, docId, 'DOCUMENT_READ');
  if (!isOwner) return; // Handled and logged by verifyResourceOwnership

  const doc = await db.getDocumentById(req.tenantId!, docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found or access denied', code: 'RESOURCE_NOT_FOUND' });
    return;
  }

  await recordAuditSafely({
    requestId: req.requestId || 'req-unknown',
    tenantId: req.tenantId!,
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DOCUMENT_READ',
    resourceType: 'document',
    resourceId: doc.id,
    decision: 'ALLOWED',
    safeDetail: `Authorized read of document '${doc.title}' [v${doc.version}]`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'INFO'
  });

  res.status(200).json({
    document: doc,
    requestId: req.requestId
  });
});

/**
 * POST /api/documents
 * Create new workspace document.
 * TenantGuard Step 3: Requires role Admin or Editor. Viewers are rejected.
 */
router.post('/', requireRole(['admin', 'editor']), async (req: Request, res: Response): Promise<void> => {
  const { title, classification, category, fullContent } = req.body;

  if (!title || !classification || !category || !fullContent) {
    res.status(400).json({
      error: 'Missing required document fields (title, classification, category, fullContent)',
      code: 'INVALID_PAYLOAD'
    });
    return;
  }

  const snippet = fullContent.length > 140 ? fullContent.slice(0, 140) + '...' : fullContent;

  const newDoc = await db.createDocument({
    tenantId: req.tenantId!, // ALWAYS derive tenant from verified session, never client payload
    title: String(title).trim(),
    classification,
    category,
    contentSnippet: snippet,
    fullContent: String(fullContent),
    createdByUserId: req.user!.id,
    createdByName: req.user!.name,
    updatedByUserId: req.user!.id,
    updatedByName: req.user!.name
  });

  await recordAuditSafely({
    requestId: req.requestId || 'req-unknown',
    tenantId: req.tenantId!,
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DOCUMENT_CREATE',
    resourceType: 'document',
    resourceId: newDoc.id,
    decision: 'ALLOWED',
    safeDetail: `Created new document '${newDoc.title}' with classification '${newDoc.classification}'`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'INFO'
  });

  res.status(201).json({
    document: newDoc,
    requestId: req.requestId
  });
});

/**
 * PUT /api/documents/:id
 * Update workspace document.
 * TenantGuard Step 3: Admin or Editor only.
 * TenantGuard Step 4: Verifies target document belongs to caller tenant.
 */
router.put('/:id', requireRole(['admin', 'editor']), async (req: Request, res: Response): Promise<void> => {
  const docId = req.params.id;
  const isOwner = await verifyResourceOwnership(req, res, docId, 'DOCUMENT_UPDATE');
  if (!isOwner) return;

  const { title, classification, category, fullContent } = req.body;

  const updatedDoc = await db.updateDocument(
    req.tenantId!,
    docId,
    {
      title,
      classification,
      category,
      fullContent
    },
    req.user!
  );

  if (!updatedDoc) {
    res.status(404).json({ error: 'Document not found or access denied', code: 'RESOURCE_NOT_FOUND' });
    return;
  }

  await recordAuditSafely({
    requestId: req.requestId || 'req-unknown',
    tenantId: req.tenantId!,
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DOCUMENT_UPDATE',
    resourceType: 'document',
    resourceId: updatedDoc.id,
    decision: 'ALLOWED',
    safeDetail: `Updated document '${updatedDoc.title}' to version ${updatedDoc.version} (integrity hash: ${updatedDoc.contentHash.slice(0, 12)}...)`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'INFO'
  });

  res.status(200).json({
    document: updatedDoc,
    requestId: req.requestId
  });
});

/**
 * DELETE /api/documents/:id
 * Delete workspace document.
 * TenantGuard Step 3: Admin only.
 * TenantGuard Step 4: Verifies target document belongs to caller tenant.
 */
router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const docId = req.params.id;
  const isOwner = await verifyResourceOwnership(req, res, docId, 'DOCUMENT_DELETE');
  if (!isOwner) return;

  const success = await db.deleteDocument(req.tenantId!, docId);
  if (!success) {
    res.status(404).json({ error: 'Document not found or access denied', code: 'RESOURCE_NOT_FOUND' });
    return;
  }

  await recordAuditSafely({
    requestId: req.requestId || 'req-unknown',
    tenantId: req.tenantId!,
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DOCUMENT_DELETE',
    resourceType: 'document',
    resourceId: docId,
    decision: 'ALLOWED',
    safeDetail: `Permanently removed document '${docId}' from tenant workspace`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    severity: 'WARNING'
  });

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
    deletedId: docId,
    requestId: req.requestId
  });
});

export default router;
