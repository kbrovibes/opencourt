-- Copy-to-New: link a copied event back to its source for the check-in widget.
alter table oc_events add column if not exists copied_from uuid references oc_events(id) on delete set null;
