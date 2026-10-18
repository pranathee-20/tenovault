/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import auditRoutes from './routes/auditEvents.js';
import simulatorRoutes from './routes/simulator.js';
import securityLabRoutes from './routes/securityLab.js';
import anomaliesRoutes from './routes/anomalies.js';
import openapiRoutes from './routes/openapi.js';
import { db } from './db/postgresAdapter.js';

export const app = express();

// Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON Body Parser with restricted payload size
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health / Status endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: 'TENOVAULT Security Gateway',
    version: '1.0.0',
    db: db.getConnectionInfo()
  });
});

// System reset endpoint (for demo / hackathon re-testing)
app.post('/api/system/reset-demo', async (_req: Request, res: Response) => {
  await db.resetToSeed();
  res.status(200).json({
    success: true,
    message: 'Demo dataset restored to pristine initial state with synthetic tenants and audit seed.'
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-events', auditRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/security-lab', securityLabRoutes);
app.use('/api/anomalies', anomaliesRoutes);
app.use('/api/docs', openapiRoutes);

// Global Safe Error Handler (Never leaks internal stack traces or foreign tenant records)
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('[TENOVAULT Internal Error]', err);
  res.status(err.status || 500).json({
    error: 'An internal server error occurred',
    code: 'INTERNAL_ERROR',
    requestId: req.requestId || 'req-err'
  });
});
