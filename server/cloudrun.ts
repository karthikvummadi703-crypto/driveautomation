import 'dotenv/config';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Reuse the existing backend app (all routes, middleware, rate limiting) unchanged.
import { app } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '..', 'dist');
const distExists = fs.existsSync(clientDist);

type Layer = { handle: Function; route?: unknown; name?: string };

// index.ts registers its 404 JSON catch-all during module import, BEFORE this
// entrypoint can mount static assets. To let the frontend be served, relocate
// the arity-2 (404) handler to the very end of the stack so our static + SPA
// routes run first. API routes are untouched; this only affects the deploy
// entrypoint, not the shared app logic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router = (app as any)._router;
const stack: Layer[] | undefined = router?.stack;
const moved: Layer[] = [];
if (Array.isArray(stack)) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const layer = stack[i] as Layer;
    // 404 handler: function with arity 2 (req, res) that isn't a route match.
    if (layer.handle && layer.handle.length === 2 && !layer.route) {
      moved.push(stack.splice(i, 1)[0]);
    }
  }
}

// Serve the built client (single-origin deployment).
app.use(
  express.static(clientDist, {
    maxAge: '7d',
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

// SPA fallback: any non-API GET returns the client index.html.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  if (!distExists) {
    res.status(200).send('DriveFlow client not built for this service.');
    return;
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Re-append the original 404 handler last so unmatched API routes still 404
// as JSON, exactly as before.
if (stack) {
  for (const layer of moved) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stack.push(layer);
  }
}

const PORT = parseInt(process.env.PORT || '8080', 10);

app.listen(PORT, () => {
  console.log(`[cloudrun] DriveFlow serving on port ${PORT}`);
  console.log(`[cloudrun] Serving client dist at: ${clientDist}`);
});

export default app;
