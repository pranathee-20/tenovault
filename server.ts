/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { app } from './server/app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    // In development, dynamically mount Vite dev server middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static assets from dist/
    const { default: expressStatic } = await import('express');
    const path = await import('path');
    app.use(expressStatic.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[TENOVAULT] Security Portal server running at http://0.0.0.0:${PORT}`);
    console.log(`[TENOVAULT] TenantGuard & TenantTrace active in mode: ${isProd ? 'PRODUCTION' : 'DEV'}`);
  });
}

startServer().catch((err) => {
  console.error('[TENOVAULT] Server boot failure:', err);
  process.exit(1);
});
