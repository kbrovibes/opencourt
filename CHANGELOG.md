# Changelog

All notable user-facing changes to OpenCourt.

## [0.12.2] — 2026-08-15

### Changed
- Header logo (OpenCourt / Badminton) is cleanly centered again: the version tag no longer sits beside "Badminton".
- App version now lives in the avatar dropdown menu as a small footer line, visible to admins only.

## [0.12.1] — 2026-08-04

### Changed
- Calendar cleanup: no today-ring, no dots — days with events are simply bold blue; selected day stays filled.

## [0.12.0] — 2026-08-04

### Added
- Public player profiles (/players/id): identity, verified seal, skill, stat tiles, recent events — viewable by any signed-in user. Player names everywhere link to them (no underline).
- Events home calendar: current month with event-dot days (browse back up to 12 months, forward 1); tap a date to filter events to that day, Clear to reset.
- Past events paginate 10 at a time with a See more button.

### Changed
- Players page is a sortable table (Name / Skill / Type columns, tap headers to sort) with the check-in actions kept compact.
- Verified mark is now an Instagram/Twitter-style blue seal.

## [0.11.2] — 2026-08-04

### Changed
- Event cards use a neatly aligned two-column layout (venue shows just its first part); version tag sits beside BADMINTON in the header.

## [0.11.1] — 2026-08-04

### Changed
- Event cards and the event detail header now show the tournament format.

## [0.11.0] — 2026-08-04

### Added
- Tournament format is now chosen at event creation (or "Choose later"); editable in Edit Event until matches are set up. The setup panel shows the chosen format with a Change link.
- Auto-complete: when every match is scored and the final is clinched, the event completes itself and shows the summary.
- Closed-event banner gains a fun-stats row: Biggest win, Closest match, Most points.
- Verified ✔ tick on any player who has actually logged in (visible to everyone).
- Profile stats now include Titles (events won — the only trophy) alongside match Wins; five-tile row.
- Admins see the app version in small type next to the title, always current per deploy.

### Changed
- Complete is a green confirmed action — the popup calls out any unfinished matches; Reopen is amber; Start is blue; emojis removed from action buttons.
- Event cards show the venue; COMPLETED badge is blue instead of grey.

## [0.10.1] — 2026-08-04

### Changed
- Today tab: with several of your events on the same day it now opens a "Your events today" list; a single event still opens directly.

## [0.10.0] — 2026-08-04

### Added
- 🌍 Groups + knockout format (FIFA style): choose 2 or 4 groups, round robin within each, then one tap generates the cross-group knockout (A1 vs B2 …) with best-of finals. Group-wise standings and score grids.

### Fixed
- Knockout fairness: byes for non-power-of-2 team counts are now a random draw (never seed order), clearly labeled, with an upfront warning suggesting Groups for even play. That's what put a team "already in the semis" in your 6-team knockout.
- Tab jump while scoring: the active event tab is now remembered (per event) and restored after every refresh — entering scores can no longer dump you back on Overview.

### Changed
- Start button now sits beside Complete; Change Format / Edit Teams stay with Draft-level actions.
- Team editing is fully lazy: ✕ marks a team for removal (↺ to undo), one Save applies adds and removals together.
- Teams list in the Players tab is back to one line per team; player names are Title Case everywhere they're displayed.

## [0.9.1] — 2026-08-04

### Changed
- Event create/edit: start time is a proper time picker (12-hour display everywhere; old freeform values still render); date/time/segmented controls share one height — no more misaligned boxes.
- Location field: address autocomplete (OpenStreetMap/Photon, biased to south India) plus quick-pick badges of recently used venues from past events.

## [0.9.0] — 2026-08-04

### Added
- Best-of finals (1/3/5): pick when generating a knockout or playoffs; semifinal winners flow into every game of the series; champions declared when a team clinches the majority.
- Profile page: career stat tiles (events, matches, wins, win rate) and a Recent Events list with links.

### Changed
- Matches tab sorting: manual matches rank like round 1 (newest rounds stay on top).
- Score grid shows every result when the same pair plays multiple matches (no more overwriting); double-tap edits the latest open match of that pairing.
- Copy to New names are unique: "Name - Mon D", then "- 1", "- 2" for same-day copies.
- Theme defaults to Auto (system) for everyone; skill row shows dots only.

## [0.8.2] — 2026-08-03

### Fixed
- Copied events get a "- <date>" name suffix (no duplicate names; copy-of-copy doesn't chain dates).
- Score popup now opens on double-tap on phones (custom tap timing instead of dblclick; no zoom hijack).

### Changed
- Matches tab: rounds no longer fold — sorted newest round first, completed rounds keep a ✓ done marker.

## [0.8.1] — 2026-08-03

### Changed
- Event page compaction: share URL box replaced by a small Share chip in the header; admin actions are a uniform compact 3-column grid (Un-start now sits beside Copy to New); stage-panel buttons slimmed.
- Score grid stretches to full width when there are few teams; tap a cell to select it, double-tap to enter or edit that match's score in an in-app popup (admins, while running).

## [0.8.0] — 2026-08-03

### Added
- Copy to New: any event can be duplicated as a today-dated draft; copied events get a folded widget to bulk re-check-in the previous crowd (tap names → one Check in button).
- Reset Scores (rewinds brackets, keeps lineup) and Reset Event (clears matches, back to locked teams — roster/check-ins/teams retained), both behind themed in-app confirmation dialogs.
- Back to Draft and Cancel now ask for confirmation in-app.
- Admins can edit a completed match score until the event is completed (guarded when the next bracket round is already scored).
- Teams are editable at any point before the tournament starts (direct Edit teams from matches-set).

### Changed
- Matches tab: the active round shows on top; fully-scored rounds fold up (tap to expand).
- The "Tournament / STARTED" box is gone — stage now shows as a chip next to the LIVE badge; only actionable buttons remain.
- Bottom nav: Today is first; "Users" renamed to "Players".

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
