-- Run once against the already-deployed database (schema.sql already has these
-- columns for fresh installs).
alter table videos add column if not exists hook text;
alter table videos add column if not exists tool_features text[];
alter table videos add column if not exists difficulty text;
alter table videos add column if not exists takeaway text;
