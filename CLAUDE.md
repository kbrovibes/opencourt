# opencourt

**Badminton event/tournament manager** — spiritual fork of snobaddy (../snobaddy), same stack and look, different domain model (multi-event, registration + check-in + partner pairing).

Live: https://opencourt-badminton.vercel.app · Repo: kbrovibes/opencourt

### Key domain terms
- **Event** — one tournament/play day (like snobaddy's "Session", but many can be live at once). `draft` (admins only) → `live` → `completed`/`cancelled`. Singles or doubles. Has a tiny URL `/e/<short_code>` for WhatsApp sharing.
- **Register** — "I'm interested". Active registrations beyond `max_players` (by registration order) display as waitlist — computed, never stored.
- **Check in** — separate action once `checkin_opens_at` passes (null = any time while live). Non-admins blocked when checked-in count ≥ max.
- **Partner** — doubles only, checked-in players pick from other checked-in players; mutual pick = confirmed pair.
- **Team** — formed by admins in the team-formation stage (tap tiles; 2 players for doubles, 1 for singles); seed = creation order.
- **Stage machine** — live events run roster → team_formation → teams_locked → matches_set → started (`oc_events.stage`).
- **Match** — team vs team; formats: single elimination (byes to top seeds, winners auto-advance), round robin, manual. Scores only after Start; standings + champion banner in tabs.
- **Skill level** — nullable 1–5 on players; shown in Users tab only, never on event pages (no team bias).

### Admin model
`oc_settings.everyone_admin` (jsonb bool) makes EVERYONE admin while true (current state). Disable:
`update oc_settings set value='false' where key='everyone_admin';` then per-player `oc_players.is_admin`.

## Tech stack (identical to snobaddy)

| Layer      | Technology |
|------------|------------|
| Framework  | Next.js 16 (App Router, TypeScript), React 19 |
| Styling    | Tailwind 4, CSS-variable palette in `globals.css` (stone light / near-black dark) |
| Database   | Supabase — **shared project with snobaddy**; all tables `oc_`-prefixed. NEVER touch non-`oc_` tables. |
| Auth       | Supabase Google OAuth + email/password |
| Deployment | Vercel (`opencourt` project), push-to-main auto-deploys |

## Project structure

```
src/
  proxy.ts                       # auth guard; preserves ?next= for /e/ deep links
  lib/
    auth.ts                      # getAuthPlayer (React.cache) + everyone_admin override
    api-auth.ts                  # requireAuth / requireAdmin for API routes
    supabase*.ts                 # service / server-cookie / browser clients (snobaddy pattern)
    db/{players,events,matches}.ts  # ALL db access lives here
  app/
    (public)/welcome/            # logged-out landing (carries ?next=)
    login/                       # Google + email/password
    auth/callback/route.ts       # OAuth callback; creates/claims oc_players by email
    e/[code]/route.ts            # tiny URL redirect
    (app)/                       # authed shell: Header + BottomNav (Events/Users/Profile)
      page.tsx                   # events home
      events/new/                # admin create form
      events/[id]/               # detail: share, status controls, actions, roster, matches
      users/                     # admin console: event selector + check-ins + add/bulk users
      profile/
    api/{events,players,matches,me,health}/
supabase/migrations/             # applied via Supabase management API
```

## DB tables
`oc_settings`, `oc_players` (user_id null = manual, claimed by email on first login), `oc_events`, `oc_event_players` (registration+checkin+partner in one row; withdrawn_at soft-delete), `oc_matches`. RLS on, no policies — service role only.

## Environment
Same four vars as snobaddy (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in `.env.local` and Vercel. Values = snobaddy's (shared project, see ../conf/keys.md).

## Coding conventions (carried from snobaddy)
- All DB access through `src/lib/db/*.ts`; server components for reads, API routes for writes.
- Client components only for interactivity; after mutations call `router.refresh()`.
- Tailwind only; mobile-first; match the existing card/badge idiom.
- CHANGELOG.md + releases/vX.Y.Z-slug.md updated with every src/ change (pre-commit hook enforces; install via `bash scripts/install-hooks.sh`).
- Keep GEMINI.md in sync with CLAUDE.md.

## Local dev
```bash
npm install && npm run dev   # http://localhost:3000
```
Test accounts (until cleanup): oc-test-{admin,arya,bala}@opencourt.test / opencourt-test-1234.
Wipe test data: `SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/cleanup-test-data.mjs`.

See DECISIONS.md for the overnight-build decision log.
