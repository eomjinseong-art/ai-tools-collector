import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY env var");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type Summary = {
  summary: string;
  summary_points: string[];
};

const SYSTEM_PROMPT = `너는 한국어 AI 툴 교육 사이트의 영상 요약가야. 유튜브 영상의 제목/설명/자막을 보고
시청자가 영상을 보지 않아도 핵심 내용을 파악할 수 있도록 요약해.
반드시 아래 JSON 형식으로만 응답해 (설명, 마크다운 코드블록 없이 순수 JSON):
{"summary": "2~4문장 요약", "summary_points": ["핵심 포인트1", "핵심 포인트2", "핵심 포인트3"]}`;

/** Bulk daily batch job — uses a fast/cheap model since this runs over ~200 videos/day. */
export async function summarizeVideo(input: {
  title: string;
  description: string;
  transcript?: string;
}): Promise<Summary> {
  const userContent = [
    `제목: ${input.title}`,
    `설명: ${input.description.slice(0, 1500)}`,
    input.transcript ? `자막 일부: ${input.transcript.slice(0, 3000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const message = await anthropic().messages.create({
    model: "claude-fable-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as Summary;
    return {
      summary: parsed.summary ?? "",
      summary_points: Array.isArray(parsed.summary_points) ? parsed.summary_points : [],
    };
  } catch {
    // Fall back to raw text if the model didn't return clean JSON — better than losing the summary entirely.
    return { summary: raw.trim(), summary_points: [] };
  }
}
