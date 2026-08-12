-- AI Tools Korea - Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- categories: the 20 AI tool categories (19 tools + 1 trend)
-- ─────────────────────────────────────────────
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,               -- e.g. 'chatgpt', 'claude', 'trend'
  name text not null,                      -- e.g. '챗GPT'
  description text,                        -- short blurb for category page
  search_keywords text[] not null default '{}', -- YouTube search queries used by the collector
  is_trend boolean not null default false, -- true only for the trend category
  sort_order int not null default 0,
  icon_url text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- videos: collected YouTube videos + AI summary
-- ─────────────────────────────────────────────
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique,
  category_id uuid not null references categories(id) on delete cascade,
  title text not null,
  description text,
  channel_title text,
  channel_id text,
  thumbnail_url text,
  published_at timestamptz,
  view_count bigint default 0,
  like_count bigint default 0,
  duration_seconds int,
  summary text,                 -- AI-generated summary (Claude)
  summary_points text[],        -- bullet-point takeaways
  transcript_lang text,         -- language of transcript used for summary, if any
  rank int,                     -- 1..10 position within its category
  status text not null default 'published' check (status in ('published','pending','excluded')),
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_videos_category on videos(category_id);
create index if not exists idx_videos_rank on videos(category_id, rank);
create index if not exists idx_videos_status on videos(status);

-- ─────────────────────────────────────────────
-- excluded_videos: manual blocklist so the collector never re-adds them
-- ─────────────────────────────────────────────
create table if not exists excluded_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique,
  reason text,
  excluded_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- guidebook_sections: editorial / how-to content shown alongside videos
-- ─────────────────────────────────────────────
create table if not exists guidebook_sections (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  slug text not null unique,
  title text not null,
  content_markdown text not null,
  source_video_ids uuid[] not null default '{}', -- videos.id this section was synthesized from
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guidebook_category on guidebook_sections(category_id);

-- ─────────────────────────────────────────────
-- ads: self-served banner ads (image + link) shown on the site
-- ─────────────────────────────────────────────
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  placement text not null check (placement in ('home_top','home_bottom','category_sidebar','video_inline','guidebook_footer')),
  image_url text not null,
  link_url text not null,
  alt_text text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ads_placement on ads(placement, is_active);

-- ─────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_videos_updated_at on videos;
create trigger trg_videos_updated_at before update on videos
  for each row execute function set_updated_at();

drop trigger if exists trg_guidebook_updated_at on guidebook_sections;
create trigger trg_guidebook_updated_at before update on guidebook_sections
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security: public read, writes only via service_role
-- ─────────────────────────────────────────────
alter table categories enable row level security;
alter table videos enable row level security;
alter table excluded_videos enable row level security;
alter table guidebook_sections enable row level security;
alter table ads enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read published videos" on videos for select using (status = 'published');
create policy "public read published guidebook" on guidebook_sections for select using (is_published = true);
create policy "public read active ads" on ads for select using (is_active = true);
-- excluded_videos has no public policy: only service_role (which bypasses RLS) can read/write it.
