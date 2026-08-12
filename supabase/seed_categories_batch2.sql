-- Second batch: 20 -> 30 categories. Safe to re-run: upserts on slug.
--
-- These are niche compared to batch 1, so target_video_count is 5 (not the
-- default 10) and search_keywords is kept to 2 per category, not 3-4 -- top-5
-- doesn't need as many candidates, and it keeps YouTube search.list quota
-- headroom: 10 categories x 2 keywords x 100 units = 2,000 units/day added
-- on top of batch 1's ~6,000, still under the 10,000/day default quota.
--
-- 'trend' moves from sort_order 20 to 30 so it stays last after this batch.

update categories set sort_order = 30 where slug = 'trend';

insert into categories (slug, name, description, search_keywords, is_trend, sort_order, target_video_count) values
  ('gamma',          '감마',           'AI 프레젠테이션·PPT 생성 툴',              array['감마 AI 사용법','Gamma AI PPT 만들기'], false, 20, 5),
  ('notebooklm',     '노트북LM',       '구글의 AI 리서치·요약·팟캐스트 생성 도구', array['노트북LM 사용법','NotebookLM 활용법'], false, 21, 5),
  ('clova-x',        '클로바X',        '네이버의 한국어 특화 AI 챗봇',              array['클로바X 사용법','CLOVA X 활용'], false, 22, 5),
  ('github-copilot', '깃허브 코파일럿', 'AI 코딩 어시스턴트',                        array['깃허브 코파일럿 사용법','GitHub Copilot 활용'], false, 23, 5),
  ('lovable',        '러버블',         '노코드 AI 앱 빌더, 바이브 코딩',            array['러버블 AI 사용법','Lovable AI 앱 만들기'], false, 24, 5),
  ('adobe-firefly',  '어도비 파이어플라이', 'AI 이미지 생성·편집 툴',               array['파이어플라이 사용법','Adobe Firefly AI 활용'], false, 25, 5),
  ('veo',            '구글 비오',      'Google의 AI 영상 생성 모델',                array['구글 비오 사용법','Veo AI 영상 생성'], false, 26, 5),
  ('typecast',       '타입캐스트',     '한국 AI 음성 합성·더빙 서비스',             array['타입캐스트 사용법','Typecast AI 활용'], false, 27, 5),
  ('grok',           '그록',           'xAI의 AI 챗봇',                             array['그록 AI 사용법','Grok AI 활용'], false, 28, 5),
  ('genspark',       '젠스파크',       'AI 에이전트 기반 검색·문서 생성 도구',      array['젠스파크 사용법','Genspark AI 활용'], false, 29, 5)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  search_keywords = excluded.search_keywords,
  is_trend = excluded.is_trend,
  sort_order = excluded.sort_order,
  target_video_count = excluded.target_video_count;
