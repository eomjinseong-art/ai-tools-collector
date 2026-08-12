const API_BASE = "https://www.googleapis.com/youtube/v3";

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY env var");
  return key;
}

export type SearchResultId = { videoId: string };

/**
 * search.list — 100 quota units per call. Keep keyword lists per category short
 * (3-4 for the original 20, 2 for the smaller batch-2 categories) since 30
 * categories' keyword lists sum to ~80 ≈ 8,000 units/day against the default
 * 10,000/day project quota. Raise Google Cloud quota before adding more keywords.
 */
export async function searchVideos(keyword: string, maxResults = 15): Promise<SearchResultId[]> {
  const params = new URLSearchParams({
    key: apiKey(),
    part: "snippet",
    q: keyword,
    type: "video",
    order: "relevance",
    regionCode: "KR",
    relevanceLanguage: "ko",
    safeSearch: "moderate",
    maxResults: String(maxResults),
  });

  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`YouTube search failed for "${keyword}": ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> };
  return (json.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))
    .map((videoId) => ({ videoId }));
}

export type VideoDetails = {
  youtube_id: string;
  title: string;
  description: string;
  channel_title: string;
  channel_id: string;
  thumbnail_url: string;
  published_at: string;
  view_count: number;
  like_count: number;
  duration_seconds: number;
};

/** ISO 8601 duration (e.g. "PT4M13S") -> seconds. */
export function parseDurationSeconds(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}

/** videos.list — ~1 quota unit per call. Batches up to 50 ids at a time. */
export async function fetchVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
  const results: VideoDetails[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      key: apiKey(),
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
    });
    const res = await fetch(`${API_BASE}/videos?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`YouTube videos.list failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          channelTitle: string;
          channelId: string;
          publishedAt: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
        };
        statistics?: { viewCount?: string; likeCount?: string };
        contentDetails: { duration: string };
      }>;
    };

    for (const item of json.items ?? []) {
      results.push({
        youtube_id: item.id,
        title: item.snippet.title,
        description: item.snippet.description ?? "",
        channel_title: item.snippet.channelTitle,
        channel_id: item.snippet.channelId,
        thumbnail_url:
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          "",
        published_at: item.snippet.publishedAt,
        view_count: Number(item.statistics?.viewCount ?? 0),
        like_count: Number(item.statistics?.likeCount ?? 0),
        duration_seconds: parseDurationSeconds(item.contentDetails.duration),
      });
    }
  }
  return results;
}
