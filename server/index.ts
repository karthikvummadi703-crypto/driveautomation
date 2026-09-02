import 'dotenv/config';
import dns from 'node:dns';
import { pathToFileURL } from 'node:url';

dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import journalRoutes from './routes/journal.js';
import driveRoutes from './routes/drive.js';

export const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Global request timeout — prevents hung external API calls from tying up
// the Node event loop indefinitely.
app.use((req, res, next) => {
  req.setTimeout(60_000, () => {
    res.status(504).json({ error: 'Request timed out.' });
  });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/', apiLimiter);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat requests. Please slow down.' },
});

app.use('/api/chat', chatLimiter);

const driveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many Drive API requests. Please slow down.' },
});

app.use('/api/drive', driveLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Simple structured request logging (no secret material).
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    }
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/drive', driveRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[server] Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

const isMainModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`[server] DriveFlow backend running on port ${PORT}`);
    console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
