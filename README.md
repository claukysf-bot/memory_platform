# Memory Platform 🌙

Calendar-style memory storage for AI continuity across platforms.

## Features
- Calendar UI for browsing memories by date
- Full-text search with keyword tagging
- REST API for AI self-serve memory access
- Warm yellow theme + dark mode
- SQLite backend (lightweight, portable)

## API

**Auth:** Bearer token via `MEMORY_AUTH_TOKEN` env var.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memories` | List/search memories (query params: `q`, `date`, `month`, `category`, `keyword`, `importance`) |
| GET | `/api/memories/:id` | Get single memory |
| POST | `/api/memories` | Create memory |
| POST | `/api/memories/batch` | Create multiple memories |
| PUT | `/api/memories/:id` | Update memory |
| DELETE | `/api/memories/:id` | Delete memory |
| GET | `/api/memories/calendar/:yearMonth` | Calendar heatmap data |
| GET | `/api/memories/categories` | List categories |
| GET | `/api/memories/keywords` | List keywords with frequency |
| GET | `/api/stats` | Overview stats |

## Memory Schema
```json
{
  "date": "2026-03-05",
  "time": "14:30",
  "content": "What happened",
  "keywords": ["tag1", "tag2"],
  "category": "relationship",
  "importance": 4,
  "source": "telegram"
}
```

## Deploy on Railway
1. Connect this repo to a Railway service
2. Add a volume mounted at `/data`
3. Set env vars: `MEMORY_AUTH_TOKEN`
4. Deploy

## Run locally
```bash
npm install
MEMORY_AUTH_TOKEN=mytoken node server.js
```
