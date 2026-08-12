import "dotenv/config";
import { supabase, type Category } from "./lib/supabase.js";
import { searchVideos, fetchVideoDetails, type VideoDetails } from "./lib/youtube.js";
import { fetchTranscript } from "./lib/transcript.js";
import { summarizeVideo } from "./lib/summarize.js";

const VIDEOS_PER_CATEGORY = 10;
const MIN_DURATION_SECONDS = 60; // skip Shorts / low-effort clips

/** Simple "hot" ranking: popular AND recent beats either alone. */
function rankScore(video: VideoDetails): number {
  const publishedMs = new Date(video.published_at).getTime();
  const daysAgo = Math.max(0, (Date.now() - publishedMs) / 86_400_000);
  return video.view_count / Math.pow(daysAgo + 2, 1.4);
}

async function collectCategory(
  category: Category,
  excludedIds: Set<string>,
): Promise<void> {
  console.log(`\n=== [${category.name}] 수집 시작 (키워드: ${category.search_keywords.join(", ")}) ===`);

  // 1) search each keyword, dedupe video ids
  const foundIds = new Set<string>();
  for (const keyword of category.search_keywords) {
    try {
      const results = await searchVideos(keyword);
      for (const r of results) foundIds.add(r.videoId);
    } catch (err) {
      console.error(`  검색 실패 "${keyword}":`, err);
    }
  }

  const candidateIds = [...foundIds].filter((id) => !excludedIds.has(id));
  if (candidateIds.length === 0) {
    console.log("  후보 영상 없음, 스킵");
    return;
  }

  // 2) fetch details, filter shorts
  const details = (await fetchVideoDetails(candidateIds)).filter(
    (v) => v.duration_seconds >= MIN_DURATION_SECONDS,
  );

  // 3) rank, take top N
  const top = [...details].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, VIDEOS_PER_CATEGORY);
  console.log(`  후보 ${details.length}개 중 상위 ${top.length}개 선정`);

  // 4) load existing rows for this category to skip re-summarizing unchanged videos
  //    and to know which old videos need to be dropped from the category.
  const { data: existingRows, error: existingErr } = await supabase
    .from("videos")
    .select(
      "youtube_id, title, description, summary, summary_points, hook, tool_features, difficulty, takeaway, transcript_lang",
    )
    .eq("category_id", category.id);
  if (existingErr) throw existingErr;

  const existingByYoutubeId = new Map((existingRows ?? []).map((row) => [row.youtube_id, row]));
  const freshIds = new Set(top.map((v) => v.youtube_id));

  // 5) summarize (skip if title+description unchanged from what we already have)
  const upsertRows = [];
  for (let i = 0; i < top.length; i++) {
    const video = top[i];
    const existing = existingByYoutubeId.get(video.youtube_id);
    const sameContent =
      existing && existing.title === video.title && existing.description === video.description;
    // A prior run may have saved a truncated/raw JSON blob into `summary` (see
    // summarize.ts fix) — detect and force a re-summarize even if title/description
    // didn't change, so old broken rows self-heal on the next run.
    const isCorrupted = Boolean(existing?.summary && existing.summary.trim().startsWith("{"));
    const unchanged = sameContent && !isCorrupted;

    let summary = existing?.summary ?? "";
    let summaryPoints = existing?.summary_points ?? [];
    let hook = existing?.hook ?? "";
    let toolFeatures = existing?.tool_features ?? [];
    let difficulty = existing?.difficulty ?? "";
    let takeaway = existing?.takeaway ?? "";
    let transcriptLang = existing?.transcript_lang ?? null;

    if (!unchanged) {
      if (isCorrupted) console.log(`  깨진 요약 감지, 재요약: ${video.title}`);
      const transcript = await fetchTranscript(video.youtube_id);
      try {
        const result = await summarizeVideo({
          title: video.title,
          description: video.description,
          transcript: transcript?.text,
        });
        summary = result.summary;
        summaryPoints = result.summary_points;
        hook = result.hook;
        toolFeatures = result.tool_features;
        difficulty = result.difficulty;
        takeaway = result.takeaway;
        transcriptLang = transcript?.lang ?? null;
      } catch (err) {
        console.error(`  요약 실패 (${video.youtube_id}):`, err);
      }
    }

    upsertRows.push({
      youtube_id: video.youtube_id,
      category_id: category.id,
      title: video.title,
      description: video.description,
      channel_title: video.channel_title,
      channel_id: video.channel_id,
      thumbnail_url: video.thumbnail_url,
      published_at: video.published_at,
      view_count: video.view_count,
      like_count: video.like_count,
      duration_seconds: video.duration_seconds,
      summary,
      summary_points: summaryPoints,
      hook,
      tool_features: toolFeatures,
      difficulty,
      takeaway,
      transcript_lang: transcriptLang,
      rank: i + 1,
      status: "published" as const,
    });
  }

  // 6) drop videos that fell out of this category's top N
  const idsToRemove = (existingRows ?? [])
    .map((row) => row.youtube_id)
    .filter((id) => !freshIds.has(id));
  if (idsToRemove.length > 0) {
    const { error: deleteErr } = await supabase
      .from("videos")
      .delete()
      .eq("category_id", category.id)
      .in("youtube_id", idsToRemove);
    if (deleteErr) throw deleteErr;
    console.log(`  탈락 영상 ${idsToRemove.length}개 삭제`);
  }

  // 7) upsert the fresh top N
  if (upsertRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from("videos")
      .upsert(upsertRows, { onConflict: "youtube_id" });
    if (upsertErr) throw upsertErr;
    console.log(`  ${upsertRows.length}개 영상 upsert 완료`);
  }
}

async function main() {
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, slug, name, search_keywords, is_trend")
    .order("sort_order");
  if (catErr) throw catErr;
  if (!categories || categories.length === 0) {
    console.log("카테고리가 없습니다. supabase/seed_categories.sql을 먼저 실행하세요.");
    return;
  }

  const { data: excludedRows, error: exclErr } = await supabase
    .from("excluded_videos")
    .select("youtube_id");
  if (exclErr) throw exclErr;
  const excludedIds = new Set((excludedRows ?? []).map((row) => row.youtube_id));

  console.log(`카테고리 ${categories.length}개, 제외 영상 ${excludedIds.size}개 로드 완료`);

  for (const category of categories as Category[]) {
    try {
      await collectCategory(category, excludedIds);
    } catch (err) {
      console.error(`[${category.name}] 수집 중 오류:`, err);
    }
  }

  console.log("\n전체 수집 완료");
}

main().catch((err) => {
  console.error("수집 스크립트 실패:", err);
  process.exit(1);
});
