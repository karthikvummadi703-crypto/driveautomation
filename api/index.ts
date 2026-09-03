// Vercel serverless entrypoint.
// Exports the existing Express app so Vercel routes `/api/*` to it.
// The frontend (React build) is served by Vercel's static hosting.
// No static file serving or app.listen here — Vercel handles those.
import 'dotenv/config';
import dns from 'node:dns';

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import { app } from '../server/index.js';

// Vercel's Node runtime wraps a default-exported Express app automatically.
// Keep the same app instance so all routes/auth/rate-limiting behave identically.
export default app;
