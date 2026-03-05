const express = require('express');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db/schema');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || process.env.MEMORY_PORT || 3847;
const AUTH_TOKEN = process.env.MEMORY_AUTH_TOKEN || 'rosa-memory-2026';

// Ensure data directory exists (for volume mount)
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
process.env.DB_PATH = process.env.DB_PATH || path.join(dataDir, 'memories.db');

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple token auth for API routes
app.use('/api', (req, res, next) => {
  // Allow GET from browser (cookie or no-auth for UI)
  const token = req.headers['authorization']?.replace('Bearer ', '') 
    || req.query.token;
  
  // Skip auth for GET requests from same origin (UI usage)
  if (req.method === 'GET' && !req.headers['authorization'] && !req.query.token) {
    return next();
  }
  
  // Require auth for mutations
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    if (token !== AUTH_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }
  
  next();
});

// Init database
const db = initDB();

// Health check (no DB dependency)
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// API routes
app.use('/api', apiRoutes(db));

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Memory Platform running on http://0.0.0.0:${PORT}`);
  console.log(`Auth token: ${AUTH_TOKEN}`);
});
