-- Run this once against the already-deployed database (schema.sql already has this
-- column for fresh installs — this migration is only for DBs created before it existed).
alter table guidebook_sections
  add column if not exists source_video_ids uuid[] not null default '{}';
