# Round 4 — copy/reset/confirm batch (2026-08-03, v0.8.0)

Judgment calls:

1. **Copy to New** keeps the same name (no "(copy)" suffix — the date distinguishes), lands as **draft dated today (IST)**, clears `checkin_opens_at` (stale timestamps make no sense), fresh short code. `copied_from` links back for the widget.
2. **Copy-check-ins widget** appears only for admins, only on copied events, only in roster stage, and hides players already checked in. Nothing preselected; "Select all" is one tap away.
3. **Reset Scores semantics**: teams that reached a later bracket round *by winning* are cleared from those slots; **bye seeds and standings-seeded playoff slots survive** (they weren't earned by a scored match). Lineup untouched.
4. **Reset Event** = matches deleted, stage → teams_locked, format cleared, completed events revived to live. Roster/check-ins/teams intact per your spec.
5. **Score editing** allowed on completed matches until the event is completed — but blocked if the next bracket round is already scored (the edit would corrupt progression); error message points to Reset Scores.
6. **Delete kept its 2-tap inline confirm** (not the new dialog) — it already worked and is the most deliberate action; happy to unify if you prefer.
7. The "Tournament/STARTED" box: header removed rather than the whole panel — its buttons (finalize/format/start/playoffs/resets) are the tournament engine. Stage now reads as a chip next to LIVE ("teams / locked / matches / in play").

# Round 3 — your 7 fixes/features (2026-08-02, v0.6.x)

All validated on prod with a fresh 12-player / 6-team dry run (fixed rounds ×3 → top-4 playoffs → final → completed banner → delete).

1. **Delete = soft delete.** 🗑 in admin controls, two-tap confirm (red "Really delete?", 4s window). Sets `oc_events.deleted_at`; hidden from every query (lists, /e/ links, Today). Recover in SQL: `update oc_events set deleted_at = null where name = '…'`.
2. **Team formation is now fully client-side** — taps only touch local state; lineups appear under an amber "Not saved yet" list; one **Save N teams** bulk-inserts. You can save mid-way; only saved teams count toward Finalize (warning shown if pending exist).
3. **Dark dropdowns fixed** with `color-scheme: light/dark` on the theme root — native select popups and date pickers now follow the theme. One CSS rule, no per-select hacks.
4. **Skill defaults to 3** — DB default + backfill of all existing nulls. The register-time picker still shows (preset to current level) so people can adjust; Profile and admin edit unchanged.
5. **Your 6-team confusion — root cause & fix.** Single elim pads 6 teams to a bracket of 8 (2 byes), so round 1 was labeled "Quarterfinals" with semis pre-seeded — technically standard, practically baffling. Fixes: (a) new **Fixed rounds** format with a **matches-per-team input** — circle-method schedule, everyone plays exactly N, labeled plain "Round 1/2/3"; (b) after group play, explicit **playoffs buttons** (top 2 → final; top 4 → 1v4/2v3 semis + final) using live standings, winners auto-advance; (c) knockout labels now apply only to real bracket matches and bye teams are marked "⤴ bye". Round robin also now schedules in rounds. I made **fixed rounds the top/default suggestion** — it fits club nights best.
6. **Visual overview** — new default tab on running events: progress bar, bracket columns (winner green, loser struck, 👑 champion card), group results matrix (green/red score cells per pairing), 🥇🥈🥉 podium. All server-rendered, horizontal-scroll friendly.
7. **Closed-event banner** — completed events open with a snobaddy-style summary: champions + 🥈 runners-up + tiles (players, matches, total points). Champion for group-only events is declared only once the event is completed (admins may still want playoffs before that).

Cleanup note: my 12 "Zz *" fixture players + fixture event were fully removed after validation. Your RECCA events and real users untouched.

# Round 2 — tournaments, skill, editing (2026-08-02)

Decisions for the v0.5.x feature batch. All verified in a real browser on prod (full doubles knockout, 3-team singles knockout with a bye, round robin, skill prompt, user disable).

## Tournament model

1. **Stage machine on live events**: `roster → team_formation → teams_locked → matches_set → started`, admin-driven, each transition guarded server-side. Going back from `matches_set` deletes generated matches; "Un-start" is only offered while no scores exist. Event `status` (live/completed/…) stays independent — complete/cancel works at any stage.
2. **Teams**: `oc_teams`, seed = creation order (your tap order = seeding). Doubles = 2 taps per team; singles events get an "Add all checked-in" one-tap instead (1-player teams). "Use confirmed pairs" pre-fills doubles teams from mutual partner picks. Teams editable until matches are set.
3. **Formats shipped**: single elimination, round robin, manual (admin team-vs-team). Checked Liquipedia's CS formats — double elimination, Swiss, and GSL groups are deferred (documented below); single elim + RR cover club tournaments, and "manual" is the escape hatch.
4. **Single-elim mechanics**: bracket size = next power of two; all rounds pre-created with TBD slots; **top seeds get the byes** and sit directly in round 2; winners auto-advance on score entry. Round names: Final/Semifinals/Quarterfinals/Round N. Champion banner on the Standings tab when the final completes.
5. **Score corrections**: scores editable only after Start; a completed bracket match isn't rewound by editing (winner already advanced) — regenerate matches for a true reset. RR/manual matches can be deleted while pending.
6. **Standings** are per-team: W, L, points diff (tiebreak: wins → losses → diff). Old per-player standings replaced; player history can be derived later.
7. **Match creation now requires locked teams** — the v0.4 free-form player-vs-player match form is gone (it predates the team model). Ad-hoc matches are still possible via Manual/+ Add match using teams.

## Other decisions

8. **Skill levels**: nullable 1–5 (no forced default). Asked once, optionally, at first registration; self-serve in Profile; admin-editable per player. Shown in Users tab as dots; deliberately **not** shown anywhere on event pages (your no-bias rule) — team formation tiles are name-only.
9. **Disable ≠ delete**: `oc_players.disabled` hides them from the Users list (a "Show disabled (N)" reveal exists) and blocks admin check-in actions; history stays intact. Re-enable from the same panel.
10. **Today nav**: goes to the live event you're checked into (prefers today's date in IST); otherwise it's just Events home. Highlighted independently of the Events tab.
11. **Event editing**: everything editable except short code; singles/doubles locks once team formation starts (teams would be invalidated).
12. **Perf**: everyone_admin flag cached 30s per warm instance (saves a query on ~every request), event-detail queries parallelized, loading skeletons added. Deliberately did NOT add ISR/data-cache to authed pages — correctness first, and pages are single-digit-query cheap.
13. **Observed during validation**: you were live-testing (RECCA Trials) while I validated — I kept all fixtures separate, cancelled my test events afterwards (Saturday Doubles Bash / Singles Showdown were already cancelled by you, RR Skill Test by me). No real data touched.

## Deferred

- Double elimination / Swiss / GSL groups; bracket seeding editor (drag to reseed)
- Rewind bracket progression on score edit
- Auto-suggest balanced teams from skill levels (skill data is now collected)
- Court assignment / scheduling per match; per-round timing

# Overnight build — decision log (2026-08-01)

Every judgment call made while you slept, for morning review. Flag anything you want changed.

## Product / domain

1. **`oc_` table prefix, same Supabase project** — all OpenCourt tables are `oc_*` in the snobaddy/stonkbro Supabase project. Snobaddy data untouched. RLS is ON with no policies: the browser anon key can read nothing; every access goes through server-side service-role code (snobaddy pattern).
2. **Everyone-admin kill switch** lives in DB: `oc_settings.everyone_admin = true`. Disable without redeploy:
   `update oc_settings set value = 'false' where key = 'everyone_admin';`
   Individual admins then come from `oc_players.is_admin`.
3. **Waitlist is computed, not stored** — active registrations ordered by `registered_at`; positions beyond `max_players` show "Waitlist". Withdrawals auto-promote the next person (no state to manage).
4. **Waitlisted players may still check in** as long as checked-in count < max_players. Rationale: registration order is advisory; the real cap is who's actually at the venue. Admins bypass all caps/windows.
5. **Partner model = mutual pick.** Each checked-in player points at one partner; a pair is "confirmed" when both point at each other, otherwise shows "pending". Un-checking-in or withdrawing clears any pointers at that player. Partner picking requires *both* players to be checked in (per your spec). Singles events skip the whole feature.
6. **Registration counter can show 6/4** — it displays actives vs cap honestly rather than clamping; reads as "oversubscribed" for admins. Easy to clamp if you prefer.
7. **Matches are admin-created, manual pairing** (dropdowns over checked-in players). No auto-draws/brackets in v1. Score entry decides winner (ties rejected); standings = per-player W/L across completed matches. Delete match available.
8. **Multiple live events at once fully supported** — the Users tab scopes actions to the event picked in the dropdown (auto-selected when only one is open); event pages are self-scoped.
9. **Manual users can be claimed later**: admin-created players (optionally with email) auto-link when that email first logs in via Google — no duplicate profiles.
10. **Email/password auth kept alongside Google** (snobaddy parity). It's also how I tested everything headlessly. Rule "everyone needs Google auth" interpreted as "everyone must be signed in".

## Infra

11. **Domain: `opencourt-badminton.vercel.app`** — `opencourt.vercel.app` is taken by another account. Custom domain can be added later.
12. **Vercel project `opencourt`** linked to GitHub `kbrovibes/opencourt`; every push to main auto-deploys. Env vars set for production+development (preview scoping hit a CLI quirk; unused since we push straight to main).
13. **Supabase auth allowlist** now includes `https://opencourt.vercel.app/**`, `https://opencourt-*.vercel.app/**`, `http://localhost:3000/**` (appended; stonkbro/snobaddy entries untouched). Google provider was already configured for this project, so OAuth should work as-is — **one thing I could not fully test headlessly: a real Google sign-in click. Everything downstream of auth is validated.**
14. **The old `GITHUB_PAT_SNOBADDY_KEY` in ../conf/keys.md is dead** (bad credentials). Used your logged-in `gh` CLI instead.
15. **Icons** are generated (scripts/gen-icons.py): sky-blue tile + white badminton court lines. Placeholder-quality by design — swap when you have a real logo.

## Testing done (all in a real browser, prod + local)

Login (password), player auto-creation, everyone-admin, event create (doubles, max 4, live), tiny URL `/e/CODE` incl. logged-out deep-link → login → land on event, register, waitlist (5th/6th of 4), self check-in, undo, partner pick → pending → mutual confirm 🤝, admin Users tab (event selector, manual check-in, register-only, single add, bulk add w/ dedupe), match create, score 21–15, standings, singles event (2-slot match form, no partner UI), profile (name edit UI, admin badge, version), light/dark themes, logout.

**Bug found & fixed during testing (v0.4.1):** password sign-in used `router.push`, which raced the auth cookies and bounced to /welcome, losing the deep link. Now a full navigation.

## Test data

All validation fixtures (test events, players, and auth accounts) were removed on 2026-08-02 before the repo went public.

## Deferred (candidates for next session)

- WhatsApp-screenshot bulk import (your listed later-feature)
- Auto match-making from confirmed pairs; brackets/draws
- Event edit form (name/date/caps editable via API today, no UI)
- Push notifications (sw.js handlers are in place, no server sender)
- Clamp/full-badge for oversubscribed counter, if preferred
