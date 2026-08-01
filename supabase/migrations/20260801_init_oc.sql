-- OpenCourt initial schema. All tables oc_-prefixed: this database is shared
-- with snobaddy (same Supabase project) — never touch non-oc_ tables.

create table if not exists oc_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Everyone-is-admin kill switch: on by default until disabled.
insert into oc_settings (key, value) values ('everyone_admin', 'true')
on conflict (key) do nothing;

create table if not exists oc_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,          -- null for manually-created players; claimed by email on first login
  name text not null,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists oc_players_email_idx on oc_players (email);

create table if not exists oc_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  start_time text,              -- freeform "6:00 PM"
  event_type text not null default 'doubles' check (event_type in ('singles','doubles')),
  max_players integer not null default 32,
  status text not null default 'draft' check (status in ('draft','live','completed','cancelled')),
  checkin_opens_at timestamptz, -- null = check-in open whenever event is live
  short_code text unique not null,  -- tiny URL: /e/<short_code>
  location text,
  notes text,
  created_by uuid references oc_players(id),
  created_at timestamptz not null default now()
);

create table if not exists oc_event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references oc_events(id) on delete cascade,
  player_id uuid not null references oc_players(id) on delete cascade,
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,    -- null = registered but not checked in
  withdrawn_at timestamptz,     -- null = active; waitlist is computed from registration order
  partner_id uuid references oc_players(id),  -- doubles: my chosen partner (mutual pick = confirmed pair)
  unique (event_id, player_id)
);
create index if not exists oc_event_players_event_idx on oc_event_players (event_id);

create table if not exists oc_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references oc_events(id) on delete cascade,
  match_type text not null check (match_type in ('singles','doubles')),
  team1_player1_id uuid not null references oc_players(id),
  team1_player2_id uuid references oc_players(id),   -- null for singles
  team2_player1_id uuid not null references oc_players(id),
  team2_player2_id uuid references oc_players(id),   -- null for singles
  team1_score integer,
  team2_score integer,
  winning_team smallint check (winning_team in (1,2)),
  status text not null default 'pending' check (status in ('pending','completed')),
  court text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists oc_matches_event_idx on oc_matches (event_id);

-- RLS on, no policies: browser anon key sees nothing; all access goes through
-- server-side service-role client (same pattern as snobaddy).
alter table oc_settings enable row level security;
alter table oc_players enable row level security;
alter table oc_events enable row level security;
alter table oc_event_players enable row level security;
alter table oc_matches enable row level security;
