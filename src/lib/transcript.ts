import { YoutubeTranscript } from "youtube-transcript";

/**
 * Best-effort caption fetch. Many Korean YouTube videos have no captions or have them
 * disabled, so this is expected to fail often — callers should treat null as normal,
 * not an error, and fall back to summarizing from title/description alone.
 */
export async function fetchTranscript(videoId: string): Promise<{ text: string; lang: string } | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ko" });
    if (!segments.length) return null;
    return { text: segments.map((s) => s.text).join(" "), lang: "ko" };
  } catch {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId);
      if (!segments.length) return null;
      return { text: segments.map((s) => s.text).join(" "), lang: "unknown" };
    } catch {
      return null;
    }
  }
}
