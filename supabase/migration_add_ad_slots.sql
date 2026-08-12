-- Run once against the already-deployed database (schema.sql already has this
-- for fresh installs). Adds 4 dedicated category-sidebar ad slots.
alter table ads drop constraint if exists ads_placement_check;
alter table ads add constraint ads_placement_check check (placement in (
  'home_top','home_bottom',
  'category_sidebar','category_sidebar_1','category_sidebar_2','category_sidebar_3','category_sidebar_4',
  'video_inline','guidebook_footer'
));
