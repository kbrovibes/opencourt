-- Round 3: soft-delete events, default skill 3, fixed_rounds format.

alter table oc_events add column if not exists deleted_at timestamptz;

alter table oc_players alter column skill_level set default 3;
update oc_players set skill_level = 3 where skill_level is null;

alter table oc_events drop constraint if exists oc_events_match_format_check;
alter table oc_events add constraint oc_events_match_format_check
  check (match_format in ('manual','single_elim','round_robin','fixed_rounds'));
