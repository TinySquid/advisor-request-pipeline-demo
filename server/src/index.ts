import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { MastraServer } from '@mastra/hono';
import type { HonoBindings, HonoVariables } from '@mastra/hono';
import { serveStatic } from '@hono/node-server/serve-static';

import { mastra } from './mastra/index.js';
import { processRoute } from './routes/process.js';

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

// auto-registers /api/agents/* and /api/workflows/*
const server = new MastraServer({ app, mastra });
await server.init();

app.route('/api', processRoute);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/*', serveStatic({ root: '../web/dist' }));

app.get('*', serveStatic({ root: '../web/dist', path: 'index.html' }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
