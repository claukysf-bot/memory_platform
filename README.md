# Memory Platform 🌙

Calendar-style memory storage for AI continuity across platforms.

## One-Click Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/claukysf-bot/memory_platform?referralCode=)

Or manually: Railway → New Project → Deploy from GitHub Repo → `https://github.com/claukysf-bot/memory_platform`

### After deploy:
1. Add a **Volume** → mount path: `/data`
2. Set **Variables**:
   - `MEMORY_AUTH_TOKEN` = **change this to your secret password**
   - `DATA_DIR` = `/data`
3. Go to **Settings → Networking → Generate Domain**
4. Done!

## Features
- 📅 Calendar UI for browsing memories by date
- 🔍 Full-text search with keyword tagging
- 🏷️ Categories and importance levels (1-5)
- 🌗 Warm yellow theme + auto dark mode
- 🤖 REST API for AI self-serve memory access
- 💾 SQLite backend (lightweight, persistent via volume)

## API

**Auth:** `Authorization: Bearer <MEMORY_AUTH_TOKEN>` header for POST/PUT/DELETE.  
GET requests work without auth (for the UI).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memories` | List/search (`q`, `date`, `month`, `category`, `keyword`, `importance`) |
| GET | `/api/memories/:id` | Get single memory |
| POST | `/api/memories` | Create memory |
| POST | `/api/memories/batch` | Batch create |
| PUT | `/api/memories/:id` | Update memory |
| DELETE | `/api/memories/:id` | Delete memory |
| GET | `/api/memories/calendar/:yearMonth` | Calendar heatmap (e.g. `2026-03`) |
| GET | `/api/memories/categories` | List categories |
| GET | `/api/memories/keywords` | List keywords + frequency |
| GET | `/api/stats` | Overview stats |

## Memory Format
```json
{
  "date": "2026-03-05",
  "time": "14:30",
  "content": "What happened or what to remember",
  "keywords": ["rosa", "preference", "food"],
  "category": "relationship",
  "importance": 4,
  "source": "telegram"
}
```

## Run locally
```bash
npm install
MEMORY_AUTH_TOKEN=mytoken node server.js
# → http://localhost:3847
```
