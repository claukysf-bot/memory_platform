const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const AUTH_TOKEN = process.env.MEMORY_AUTH_TOKEN || 'rosa-memory-2026';

console.log('[boot] Starting Memory Platform...');
console.log('[boot] PORT=' + PORT);
console.log('[boot] NODE_ENV=' + process.env.NODE_ENV);
console.log('[boot] DATA_DIR=' + (process.env.DATA_DIR || 'not set'));

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  console.log('[boot] Data dir ready: ' + dataDir);
} catch (err) {
  console.error('[boot] Failed to create data dir:', err.message);
}
process.env.DB_PATH = process.env.DB_PATH || path.join(dataDir, 'memories.db');
console.log('[boot] DB_PATH=' + process.env.DB_PATH);

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check — always works, no DB dependency
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

// Try to init database
let db = null;
try {
  const { initDB } = require('./db/schema');
  db = initDB();
  console.log('[boot] Database initialized');
} catch (err) {
  console.error('[boot] Database init failed:', err.message);
  console.error(err.stack);
}

// Auth middleware for API
app.use('/api', (req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    if (token !== AUTH_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }
  if (!db) {
    return res.status(503).json({ ok: false, error: 'Database not available' });
  }
  next();
});

// API routes
if (db) {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes(db));
}

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server FIRST — health check needs this
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('[boot] Memory Platform listening on port ' + PORT);
});

server.on('error', (err) => {
  console.error('[boot] Server error:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('[fatal] Unhandled rejection:', err);
});
