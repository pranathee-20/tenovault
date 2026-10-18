/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';

const router = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TENOVAULT Security API',
    version: '1.0.0',
    description: 'Tenant Safe Workspace Portal and API with TenantGuard Authorization and TenantTrace Auditability'
  },
  servers: [{ url: '/api', description: 'TENOVAULT Primary Host' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Signed HMAC-SHA256 JWT containing verified userId, tenantId, and role.'
      }
    },
    schemas: {
      WorkspaceDocument: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'doc-acme-001' },
          tenantId: { type: 'string', example: 'tenant-acme-corp' },
          title: { type: 'string', example: 'Quantum Lattice Architecture' },
          classification: { type: 'string', enum: ['CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC'] },
          category: { type: 'string', enum: ['Strategy', 'Engineering', 'Financial', 'Legal', 'Compliance'] },
          contentSnippet: { type: 'string' },
          fullContent: { type: 'string' },
          contentHash: { type: 'string', description: 'SHA-256 integrity hash' },
          version: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      AuditEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'aud-1729000000-xyz' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', example: 'req-9021' },
          tenantId: { type: 'string', example: 'tenant-acme-corp' },
          actorEmail: { type: 'string', example: 'alice@acme.test' },
          actorRole: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
          action: { type: 'string', example: 'DOCUMENT_READ' },
          resourceId: { type: 'string', example: 'doc-acme-001' },
          decision: { type: 'string', enum: ['ALLOWED', 'DENIED'] },
          denialReasonCode: { type: 'string', example: 'CROSS_TENANT_RESOURCE_ACCESS_DENIED' },
          safeDetail: { type: 'string' },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] }
        }
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate identity and obtain JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } }
        },
        responses: {
          200: { description: 'Authenticated successfully with token and safe user payload' },
          401: { description: 'Invalid credentials or non-existent user' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Retrieve verified caller profile and active tenant context',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Authenticated identity details' }, 401: { description: 'Unauthenticated' } }
      }
    },
    '/documents': {
      get: {
        summary: 'List tenant documents (strictly filtered by verified caller tenant)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search keywords' }],
        responses: { 200: { description: 'Array of tenant documents' } }
      },
      post: {
        summary: 'Create document (Admin or Editor only)',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Created document' }, 403: { description: 'Role denied' } }
      }
    },
    '/documents/{id}': {
      get: {
        summary: 'Read single document by ID with TenantGuard ownership check',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Document object' }, 404: { description: 'Document not found or access denied' } }
      },
      put: {
        summary: 'Update document (Admin or Editor only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated document' }, 404: { description: 'Document not found or access denied' } }
      },
      delete: {
        summary: 'Delete document (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Document deleted' }, 403: { description: 'Role denied' }, 404: { description: 'Not found' } }
      }
    },
    '/audit-events': {
      get: {
        summary: 'Query audit event timeline (strictly isolated to reviewer tenant)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Array of audit events' } }
      }
    },
    '/audit-events/export': {
      get: {
        summary: 'Download audit events scoped to verified tenant in CSV or JSON format (Admin or Editor only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'json'], default: 'json' }, description: 'Export file format' },
          { name: 'decision', in: 'query', schema: { type: 'string' } },
          { name: 'severity', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Exported file attachment with tenant isolation guarantee' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Role forbidden (e.g. Viewer)' }
        }
      }
    },
    '/security-lab/run': {
      post: {
        summary: 'Trigger automated backend security test suite against live API layer',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Test execution results and integrity assertions' } }
      }
    }
  }
};

router.get('/openapi.json', (_req: Request, res: Response): void => {
  res.status(200).json(openApiSpec);
});

export default router;
