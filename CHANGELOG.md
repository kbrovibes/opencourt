# Changelog

All notable user-facing changes to OpenCourt.

## [0.7.1] — 2026-08-03

### Changed
- Teams list and the score grid now show team names as two lines (first names only) with roomier rows — more space for the score cells.

## [0.7.0] — 2026-08-02

### Added
- Admins can grant and revoke admin rights from the user edit panel (self-demotion blocked); admins show an "admin" tag in the Users list.
- Public README with the origin story, differentiators, and mobile screenshots.

### Security
- All validation/demo accounts and fixtures purged before the repo went public; docs scrubbed of test credentials.

## [0.6.2] — 2026-08-02

### Changed
- Subtle ADMIN label in the header for admins.
- Completed events: winner/stat info now lives only in the top banner — Overview keeps just the bracket + results matrix (progress bar, duplicate champion boxes, and the podium chart are gone).

## [0.6.1] — 2026-08-02

### Fixed
- Matches header now says "group rounds" for fixed-rounds events.
- Group-format champions are only declared once the event is completed.

## [0.6.0] — 2026-08-02

### Added
- Fixed-rounds format (matches per team input) + playoffs generator (top 2 / top 4) once group play completes.
- Overview tab with visual bracket, results matrix, progress bar, and podium.
- Completed events show a summary banner: champions, runners-up, and stats.
- Event delete (recoverable), batched team saving with one Save button.

### Fixed
- Dark-mode dropdowns/date pickers no longer render white.
- Knockout round names no longer mislabel group rounds; byes are labeled explicitly.
- Skill level defaults to 3 for everyone.

## [0.5.0] — 2026-08-02

### Added
- Full tournament flow: admin team formation (tap tiles), locked teams, match formats (single elimination with auto-advancing bracket, round robin, manual), start button, score entry, tabbed Matches/Standings/Players view with champion banner.
- Skill levels (1–5): asked at registration, editable in Profile, admin-editable in Users (shown there, hidden on event pages).
- User editing + disable; event editing; "Today" bottom-nav shortcut to your checked-in event.

### Changed
- Match creation is now team-based and only available after teams are locked.

## [0.4.1] — 2026-08-01

### Fixed
- Password sign-in now lands on the intended page (shared event links included) instead of bouncing to the welcome screen.

### Added
- Test-data cleanup script, decision log (DECISIONS.md), project docs (CLAUDE.md/README).

## [0.4.0] — 2026-08-01

### Added
- Users tab for admins: select an open event, then check in / register any user; add users one-by-one or in bulk.
- Profile tab: edit display name, theme toggle, logout, app version.

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
