# CivicEvents+ Project

A community portal for local events, audio announcements, promo videos and in-app notifications.

| Folder | What it is |
|--------|------------|
| [`frontend/`](frontend/README.md) | The client: plain HTML, Tailwind (CDN), jQuery, Chart.js. How to run it, role guards, backend limitations and UX notes are in its README. |
| [`backend/`](backend/README.md) | The provided Express + PostgreSQL API (not modified). |
| [`video-demo/`](video-demo/README.md) | Demo video notes. |

Quick start: start the backend (`cd backend && npm install && npm run db:setup && npm run dev`), then serve `frontend/` with any static server (for example VS Code Live Server) and open `index.html`.
