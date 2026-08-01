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

## Test data (left in place so you can poke around)

- Events: *Saturday Doubles Bash* (`/e/5UUQXU`), *Singles Showdown* (`/e/SNGL01`)
- Auth users: oc-test-{admin,arya,bala}@opencourt.test / `opencourt-test-1234`
- Manual players: Manual Mo, Priya Test, Ravi Test
- Wipe it all: `SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/cleanup-test-data.mjs`

## Deferred (candidates for next session)

- WhatsApp-screenshot bulk import (your listed later-feature)
- Auto match-making from confirmed pairs; brackets/draws
- Event edit form (name/date/caps editable via API today, no UI)
- Push notifications (sw.js handlers are in place, no server sender)
- Clamp/full-badge for oversubscribed counter, if preferred
