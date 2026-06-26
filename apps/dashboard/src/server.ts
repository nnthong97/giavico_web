import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// ─── Planning API ─────────────────────────────────────────────────────────────
// Each endpoint tries Neon PostgreSQL first; falls back to static mock data.

async function getNeonSql() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) return null;
  try {
    const { neon } = await import('@neondatabase/serverless' as any);
    return neon(dbUrl);
  } catch {
    return null;
  }
}

app.get('/api/planning/orders', (req, res) => {
  void (async () => {
    const sql = await getNeonSql();
    if (sql) {
      try {
        const { line, status, search } = req.query;
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params: unknown[] = [];
        if (line && line !== 'all') { params.push(line); query += ` AND product_line = $${params.length}`; }
        if (status && status !== 'all') { params.push(status); query += ` AND status = $${params.length}`; }
        if (search) { params.push(`%${search}%`); query += ` AND (vn_code ILIKE $${params.length} OR vn_product_code ILIKE $${params.length})`; }
        query += ' ORDER BY order_date DESC LIMIT 200';
        const rows = await sql(query, params);
        res.json(rows); return;
      } catch { /* fall through */ }
    }
    const { PLANNING_ORDERS } = await import('./app/features/planning/data/planning-mock.data.js' as any).catch(() => ({ PLANNING_ORDERS: [] }));
    res.json(PLANNING_ORDERS ?? []);
  })();
});

app.get('/api/planning/materials', (req, res) => {
  void (async () => {
    const sql = await getNeonSql();
    if (sql) {
      try {
        const { type, search } = req.query;
        let query = 'SELECT * FROM materials WHERE 1=1';
        const params: unknown[] = [];
        if (type && type !== 'all') { params.push(type); query += ` AND type = $${params.length}`; }
        if (search) { params.push(`%${search}%`); query += ` AND (code_vn ILIKE $${params.length} OR name_vn ILIKE $${params.length})`; }
        query += ' ORDER BY expiry_date ASC';
        const rows = await sql(query, params);
        res.json(rows); return;
      } catch { /* fall through */ }
    }
    const { PLANNING_INVENTORY } = await import('./app/features/planning/data/planning-mock.data.js' as any).catch(() => ({ PLANNING_INVENTORY: [] }));
    res.json(PLANNING_INVENTORY ?? []);
  })();
});

app.get('/api/planning/stats', (req, res) => {
  void (async () => {
    const sql = await getNeonSql();
    if (sql) {
      try {
        const [orders, materials] = await Promise.all([sql`SELECT status FROM orders`, sql`SELECT expiry_date FROM materials`]);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const expiryAlerts = (materials as any[]).filter((m) => {
          if (!m.expiry_date) return false;
          const diff = Math.round((new Date(m.expiry_date).getTime() - today.getTime()) / 86400000);
          return diff >= 0 && diff < 30;
        }).length;
        res.json({
          orders: {
            total:        (orders as any[]).length,
            inProduction: (orders as any[]).filter((o) => o.status === 'DL').length,
            readyToShip:  (orders as any[]).filter((o) => o.status === 'CX').length,
            shipped:      (orders as any[]).filter((o) => o.status === 'DX').length,
            pending:      (orders as any[]).filter((o) => o.status === 'CH').length,
          },
          expiryAlerts, agedCount: 35, todayPlan: { planned: 9000, actual: 6200 },
        });
        return;
      } catch { /* fall through */ }
    }
    res.json({ orders: { total: 12, inProduction: 3, readyToShip: 1, shipped: 4, pending: 4 }, expiryAlerts: 3, agedCount: 35, todayPlan: { planned: 9000, actual: 6200 } });
  })();
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
