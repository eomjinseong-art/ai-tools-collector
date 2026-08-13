-- Sora 서비스 종료로 씨댄스(Seedance)로 교체.
-- 기존 'sora' 행을 그대로 업데이트해 category_id를 유지한다 —
-- videos/guidebook_sections 외래키가 안 깨지고, 다음 collect/guidebook 실행 때
-- 새 검색 키워드로 기존 Sora 영상·가이드북이 자연히 교체된다.

update categories set
  slug = 'seedance',
  name = '씨댄스',
  description = '바이트댄스의 AI 영상 생성 모델',
  search_keywords = array['씨댄스 사용법','Seedance AI 영상','씨댄스 활용법']
where slug = 'sora';
