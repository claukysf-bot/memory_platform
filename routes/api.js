const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // GET /api/memories - List/search memories
  router.get('/memories', (req, res) => {
    try {
      const { q, date, month, category, keyword, importance, limit = 100, offset = 0 } = req.query;
      
      // Full-text search
      if (q) {
        const stmt = db.prepare(`
          SELECT m.* FROM memories m
          JOIN memories_fts fts ON m.id = fts.rowid
          WHERE memories_fts MATCH ?
          ORDER BY m.date DESC, m.importance DESC
          LIMIT ? OFFSET ?
        `);
        const rows = stmt.all(q, Number(limit), Number(offset));
        return res.json({ ok: true, data: rows.map(parseRow), total: rows.length });
      }

      // Build filtered query
      let where = [];
      let params = [];

      if (date) {
        where.push('date = ?');
        params.push(date);
      }
      if (month) {
        where.push("date LIKE ?");
        params.push(month + '%');
      }
      if (category) {
        where.push('category = ?');
        params.push(category);
      }
      if (keyword) {
        where.push("keywords LIKE ?");
        params.push(`%${keyword}%`);
      }
      if (importance) {
        where.push('importance >= ?');
        params.push(Number(importance));
      }

      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      
      const countStmt = db.prepare(`SELECT COUNT(*) as total FROM memories ${whereClause}`);
      const { total } = countStmt.get(...params);
      
      const stmt = db.prepare(`
        SELECT * FROM memories ${whereClause}
        ORDER BY date DESC, importance DESC, created_at DESC
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(...params, Number(limit), Number(offset));
      
      return res.json({ ok: true, data: rows.map(parseRow), total });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/memories/calendar/:yearMonth - Get memory counts by date for calendar
  router.get('/memories/calendar/:yearMonth', (req, res) => {
    try {
      const { yearMonth } = req.params; // e.g. "2026-03"
      const stmt = db.prepare(`
        SELECT date, COUNT(*) as count, MAX(importance) as maxImportance
        FROM memories
        WHERE date LIKE ?
        GROUP BY date
      `);
      const rows = stmt.all(yearMonth + '%');
      return res.json({ ok: true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/memories/categories - List all categories
  router.get('/memories/categories', (req, res) => {
    try {
      const stmt = db.prepare(`SELECT DISTINCT category, COUNT(*) as count FROM memories GROUP BY category ORDER BY count DESC`);
      return res.json({ ok: true, data: stmt.all() });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/memories/keywords - List all keywords with frequency
  router.get('/memories/keywords', (req, res) => {
    try {
      const stmt = db.prepare(`SELECT keywords FROM memories`);
      const rows = stmt.all();
      const freq = {};
      for (const row of rows) {
        const kws = JSON.parse(row.keywords || '[]');
        for (const kw of kws) {
          freq[kw] = (freq[kw] || 0) + 1;
        }
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([keyword, count]) => ({ keyword, count }));
      return res.json({ ok: true, data: sorted });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/memories/:id - Get single memory
  router.get('/memories/:id', (req, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM memories WHERE id = ?');
      const row = stmt.get(req.params.id);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      return res.json({ ok: true, data: parseRow(row) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/memories - Create memory
  router.post('/memories', (req, res) => {
    try {
      const { date, time, content, keywords = [], category = 'general', importance = 3, source } = req.body;
      if (!date || !content) {
        return res.status(400).json({ ok: false, error: 'date and content are required' });
      }
      const stmt = db.prepare(`
        INSERT INTO memories (date, time, content, keywords, category, importance, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(date, time || null, content, JSON.stringify(keywords), category, importance, source || null);
      const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json({ ok: true, data: parseRow(row) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/memories/batch - Create multiple memories at once
  router.post('/memories/batch', (req, res) => {
    try {
      const { memories } = req.body;
      if (!Array.isArray(memories)) {
        return res.status(400).json({ ok: false, error: 'memories array is required' });
      }
      
      const stmt = db.prepare(`
        INSERT INTO memories (date, time, content, keywords, category, importance, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertMany = db.transaction((items) => {
        const ids = [];
        for (const m of items) {
          if (!m.date || !m.content) continue;
          const result = stmt.run(
            m.date, m.time || null, m.content,
            JSON.stringify(m.keywords || []),
            m.category || 'general',
            m.importance || 3,
            m.source || null
          );
          ids.push(result.lastInsertRowid);
        }
        return ids;
      });
      
      const ids = insertMany(memories);
      return res.status(201).json({ ok: true, created: ids.length, ids });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PUT /api/memories/:id - Update memory
  router.put('/memories/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });

      const { date, time, content, keywords, category, importance, source } = req.body;
      const stmt = db.prepare(`
        UPDATE memories SET
          date = COALESCE(?, date),
          time = COALESCE(?, time),
          content = COALESCE(?, content),
          keywords = COALESCE(?, keywords),
          category = COALESCE(?, category),
          importance = COALESCE(?, importance),
          source = COALESCE(?, source),
          updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(
        date || null, time !== undefined ? time : null, content || null,
        keywords ? JSON.stringify(keywords) : null,
        category || null, importance || null, source !== undefined ? source : null,
        req.params.id
      );
      const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
      return res.json({ ok: true, data: parseRow(row) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DELETE /api/memories/:id - Delete memory
  router.delete('/memories/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });
      db.prepare('DELETE FROM memories WHERE id = ?').run(req.params.id);
      return res.json({ ok: true, deleted: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/stats - Overview stats
  router.get('/stats', (req, res) => {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM memories').get().count;
      const categories = db.prepare('SELECT COUNT(DISTINCT category) as count FROM memories').get().count;
      const dateRange = db.prepare('SELECT MIN(date) as earliest, MAX(date) as latest FROM memories').get();
      const recent = db.prepare('SELECT * FROM memories ORDER BY created_at DESC LIMIT 5').all().map(parseRow);
      return res.json({ ok: true, data: { total, categories, ...dateRange, recent } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  function parseRow(row) {
    if (!row) return null;
    return {
      ...row,
      keywords: JSON.parse(row.keywords || '[]')
    };
  }

  return router;
};
