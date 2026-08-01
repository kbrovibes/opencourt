# OpenCourt 🏸

Badminton event & tournament manager. Create events, share a tiny link on WhatsApp, let players register and check in, pair up doubles partners, run matches, see standings.

**Live:** https://opencourt-badminton.vercel.app

A spiritual fork of [snobaddy](https://github.com/kbrovibes/snobaddy) — same stack (Next.js 16, Tailwind 4, Supabase, Vercel), same PWA-first mobile UI and themes, rebuilt around multi-event tournaments.

## Features
- Google (or email/password) sign-in; new players auto-created on first login
- Events: draft/live, singles/doubles, max players, check-in windows, locations, notes
- Tiny share URLs (`/e/AB12CD`) that survive the login redirect
- Registration with automatic waitlist; separate check-in step
- Doubles partner picking with mutual confirmation
- Admin console: manage any event's check-ins, add users one-by-one or in bulk
- Matches with score entry and live standings
- Everyone-is-admin bootstrap switch (`oc_settings.everyone_admin`)
- Light/dark/system themes, installable PWA

## Development
```bash
npm install
cp .env.local.example .env.local   # Supabase keys
npm run dev
```

Docs: `CLAUDE.md` (agent/dev guide) · `DECISIONS.md` (build decision log) · `CHANGELOG.md` + `releases/`
