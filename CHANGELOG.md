# Changelog

All notable user-facing changes to OpenCourt.

## [0.3.0] — 2026-08-01

### Added
- Events home with live/draft/past sections and a Create Event flow for admins.
- Event detail page: share link, registration, waitlist, check-in, doubles partner picking, admin status controls.
- Matches with score recording and event standings.

## [0.2.0] — 2026-08-01

### Added
- Database schema (`oc_` tables) and full API layer: events CRUD, registration/withdrawal, check-in, partner pick, players (create + bulk), matches (create, score, delete).

## [0.1.0] — 2026-08-01

### Added
- Initial scaffold: Next.js 16 + Tailwind 4 + Supabase, forked in spirit from snobaddy.
- App shell: header, bottom nav (Events / Users / Profile), light & dark themes.
- Welcome page, login page (Google + email/password), auth callback.
- PWA basics: manifest, service worker.
- Health check endpoint (`/api/health`).
