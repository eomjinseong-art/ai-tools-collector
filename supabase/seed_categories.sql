-- Seed the 20 categories (19 AI tools + 1 trend).
-- Safe to re-run: upserts on slug.

insert into categories (slug, name, description, search_keywords, is_trend, sort_order) values
  ('chatgpt',     '챗GPT',      'OpenAI의 대화형 AI, 업무·학습 활용법',        array['챗GPT 사용법','챗GPT 활용','ChatGPT 강의','챗GPT 프롬프트'], false, 1),
  ('claude',      '클로드',      'Anthropic의 AI 어시스턴트, 코딩·글쓰기 활용', array['클로드 AI 사용법','Claude AI 활용','클로드 프롬프트'], false, 2),
  ('gemini',      '제미나이',    'Google의 멀티모달 AI',                       array['제미나이 사용법','Gemini AI 활용','제미나이 활용법'], false, 3),
  ('perplexity',  '퍼플렉시티',  'AI 검색 엔진',                                array['퍼플렉시티 사용법','Perplexity AI 활용'], false, 4),
  ('wrtn',        '뤼튼',        '한국형 AI 서비스 플랫폼',                     array['뤼튼 사용법','뤼튼 AI 활용','뤼튼 프롬프트'], false, 5),
  ('canva',       '캔바',        'AI 디자인·이미지 편집 툴',                    array['캔바 사용법','캔바 AI 디자인','캔바 강의'], false, 6),
  ('midjourney',  '미드저니',    'AI 이미지 생성',                              array['미드저니 사용법','Midjourney 프롬프트','미드저니 강의'], false, 7),
  ('runway',      '런웨이',      'AI 영상 생성·편집',                           array['런웨이 사용법','Runway AI 영상','런웨이 ML 활용'], false, 8),
  ('higgsfield',  '힉스필드',    'AI 영상·이미지 생성 플랫폼',                  array['힉스필드 사용법','Higgsfield AI 활용'], false, 9),
  ('sora',        '소라',        'OpenAI의 AI 영상 생성 모델',                  array['소라 사용법','Sora AI 영상','소라 활용법'], false, 10),
  ('kling',       '클링',        '고품질 AI 영상 생성 모델',                    array['클링 AI 사용법','Kling AI 활용','클링 AI 영상 생성'], false, 11),
  ('capcut',      '캡컷',        'AI 영상 편집 앱',                             array['캡컷 사용법','캡컷 편집 강의','캡컷 AI 기능'], false, 12),
  ('vrew',        '브루',        'AI 자동 자막·영상 편집 툴',                   array['브루 사용법','Vrew 사용법','브루 편집 강의'], false, 13),
  ('suno',        '수노',        'AI 음악 생성',                                array['수노 사용법','Suno AI 노래 만들기','수노 AI 활용'], false, 14),
  ('elevenlabs',  '일레븐랩스',  'AI 음성 합성·더빙',                           array['일레븐랩스 사용법','ElevenLabs 활용','일레븐랩스 AI 음성'], false, 15),
  ('heygen',      '헤이젠',      'AI 아바타 영상 생성',                         array['헤이젠 사용법','HeyGen 활용','헤이젠 AI 아바타'], false, 16),
  ('notion-ai',   '노션AI',      '노션의 AI 글쓰기·정리 기능',                  array['노션 AI 사용법','Notion AI 활용','노션AI 활용법'], false, 17),
  ('figma',       '피그마',      'AI 기능이 포함된 디자인 협업 툴',             array['피그마 사용법','Figma AI 기능','피그마 강의'], false, 18),
  ('cursor',      '커서',        'AI 코딩 에디터',                              array['커서 사용법','Cursor AI 코딩','커서 에디터 활용'], false, 19),
  ('trend',       'AI 트렌드',   '최신 AI 소식과 트렌드 모음',                  array['AI 트렌드','AI 뉴스','최신 AI 소식','AI 이슈'], true, 20)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  search_keywords = excluded.search_keywords,
  is_trend = excluded.is_trend,
  sort_order = excluded.sort_order;
