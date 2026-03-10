# Memory Platform — Developer Notes

## Architecture
- **Runtime:** Node.js + Express
- **Database:** better-sqlite3 (SQLite with WAL mode)
- **Frontend:** Single-page app, pure vanilla JS/CSS, no frameworks
- **Hosting:** Railway (auto-deploys on push to main)
- **Repo:** github.com/claukysf-bot/memory_platform
- **Auth:** Bearer token in env var MEMORY_AUTH_TOKEN, checked on POST/PUT/DELETE

## File Structure
```
memory-platform/
  server.js          — Express setup, auth middleware, static serving
  db/schema.js       — All CREATE TABLE statements, returns db instance
  routes/api.js      — All API endpoints (single file, ~400 lines)
  public/index.html  — Entire frontend (single file SPA, ~2500 lines)
  public/emoji/      — 3D emoji PNGs for mood tracker
```

## Database Tables
1. **memories** — date, time, content, keywords(JSON), category, importance(1-5), source
   - FTS5 virtual table `memories_fts` with sync triggers
2. **moods** — date, person(rosa/claude), mood, note, source. UNIQUE(date, person)
3. **journal** — date, title, content, person
4. **journal_comments** — journal_id(FK), person, content
5. **tasks** — title, description, category, priority(1-5), status(todo/in-progress/done), deadline, completed_at

## Frontend Pattern
- Navigation: sidebar `.nav-rail` with `switchPage(name)` function
- Each page is a `<div id="pageName">` toggled by display:none/block
- `switchPage()` hides all pages, shows selected, updates header action button
- API calls go through `async function api(path, opts)` wrapper
- Auth token stored in localStorage, prompted on first write
- All dates displayed in UTC+8
- Theme: CSS variables in `:root` (light) and `.dark` (dark mode)
- Toast notifications via `toast(msg, type)`
- Modals: `.modal-overlay.open` pattern

## Adding a New Feature (checklist)
1. **Schema:** Add CREATE TABLE in `db/schema.js`
2. **Routes:** Add CRUD endpoints in `routes/api.js` (GET list, GET :id, POST, PUT, DELETE)
3. **Nav:** Add `<button class="nav-rail-item">` in the nav-rail section
4. **Page:** Add `<div id="pageName" style="display:none;">` in main content area
5. **Modals:** Add create/edit modal and delete confirmation modal
6. **switchPage():** Add hide line + case block
7. **JS:** Add page init, load, render, CRUD functions
8. **Push:** git commit + push, Railway auto-deploys

## CSS Theme Variables (key ones)
- --bg-primary, --bg-secondary, --bg-card, --bg-hover
- --text-primary, --text-secondary, --text-muted
- --accent (#D4A574 warm gold), --accent-hover, --accent-light
- --danger, --success
- --radius (12px), --radius-sm (8px)
- --shadow, --shadow-lg

## API URL
Production: https://memoryplatform-production.up.railway.app
All endpoints under /api/

## Fonts
- Quicksand (headings/UI), Noto Serif SC (Chinese), SF Pro (body fallback)
