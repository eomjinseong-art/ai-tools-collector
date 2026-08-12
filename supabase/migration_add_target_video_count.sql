-- Run once against the already-deployed database (schema.sql already has this
-- for fresh installs). Lets niche categories run with fewer than the default
-- 10 videos — new/small categories may not have 10 good candidates yet.
alter table categories add column if not exists target_video_count int not null default 10;
