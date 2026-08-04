-- FIFA-style groups: teams get a group assignment; group matches carry it too.
alter table oc_teams add column if not exists group_no integer;
alter table oc_matches add column if not exists group_no integer;
alter table oc_events drop constraint if exists oc_events_match_format_check;
alter table oc_events add constraint oc_events_match_format_check
  check (match_format in ('manual','single_elim','round_robin','fixed_rounds','groups'));
