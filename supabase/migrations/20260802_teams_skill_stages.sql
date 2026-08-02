-- OpenCourt v2: skill levels, disabled players, tournament stages, teams, match formats.

alter table oc_players
  add column if not exists skill_level integer check (skill_level between 1 and 5),
  add column if not exists disabled boolean not null default false;

-- Tournament lifecycle within a live event:
-- roster → team_formation → teams_locked → matches_set → started
alter table oc_events
  add column if not exists stage text not null default 'roster'
    check (stage in ('roster','team_formation','teams_locked','matches_set','started')),
  add column if not exists match_format text
    check (match_format in ('manual','single_elim','round_robin'));

create table if not exists oc_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references oc_events(id) on delete cascade,
  player1_id uuid not null references oc_players(id) on delete cascade,
  player2_id uuid references oc_players(id) on delete cascade,  -- null for singles teams
  seed integer not null,                                        -- creation order; used for bracket seeding
  created_at timestamptz not null default now(),
  unique (event_id, seed)
);
create index if not exists oc_teams_event_idx on oc_teams (event_id);

alter table oc_matches
  add column if not exists team1_id uuid references oc_teams(id) on delete set null,
  add column if not exists team2_id uuid references oc_teams(id) on delete set null,
  add column if not exists round integer,        -- single elim round (1 = first); null for manual/RR
  add column if not exists bracket_pos integer;  -- 0-indexed slot within the round

-- Bracket slots may start empty (TBD teams), so relax the player NOT NULLs.
alter table oc_matches
  alter column team1_player1_id drop not null,
  alter column team2_player1_id drop not null;

alter table oc_teams enable row level security;
