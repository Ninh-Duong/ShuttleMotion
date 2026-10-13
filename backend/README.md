# Backend

Node.js 22+ HTTP server for static frontend files, the canonical court, shuttle and player reference JSON, the `/shot` and `/training` pages, the lesson API (`GET /api/lessons`, `GET /api/lessons/:id`) validated at startup by `lessons.mjs`, locally installed Three.js modules, `GET /api/health`, and localhost-only diagnostics. Lessons are draft JSON files pending coach review; persistent storage will be added only when the product needs it. See `../docs/ARCHITECTURE.md`.
