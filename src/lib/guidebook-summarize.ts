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

export type GuidebookInputVideo = {
  index: number;
  title: string;
  summary_points: string[];
};

export type GuidebookSectionDraft = {
  title: string;
  content_markdown: string;
  source_video_indexes: number[];
};

const SYSTEM_PROMPT = `너는 한국어 AI 툴 교육 사이트의 가이드북 에디터야.
같은 카테고리(AI 툴)에 대한 여러 유튜브 영상의 핵심 포인트(key steps)를 입력받아,
사용자가 "이 툴로 무엇을 할 수 있는지" 주제별로 훑어볼 수 있는 가이드북 섹션으로 재구성해.

규칙:
- 영상 단위가 아니라 "주제/기능" 단위로 묶어라. 예: "썸네일 만들기", "로고 디자인하기", "프롬프트 작성법"
- 여러 영상에서 반복되는 내용은 하나로 합치고 중복을 제거해라
- 각 섹션은 실행 가능한 단계 위주로 정리해라 (마크다운 리스트 활용 가능)
- 섹션 개수는 내용에 따라 3~6개 사이로, 근거가 부족하면 억지로 만들지 마라
- 각 섹션이 어떤 입력 영상(들)에서 나왔는지 0부터 시작하는 인덱스로 표시해라
- 반드시 아래 JSON 형식으로만 응답해 (설명, 마크다운 코드블록 없이 순수 JSON):
{"sections": [{"title": "섹션 제목", "content_markdown": "마크다운 본문", "source_video_indexes": [0, 2]}]}`;

/** Low-frequency batch (~20 calls/run, one per category) — uses a stronger model since it needs to cluster/dedupe across videos. */
export async function generateGuidebookSections(
  categoryName: string,
  videos: GuidebookInputVideo[],
): Promise<GuidebookSectionDraft[]> {
  const userContent = [
    `카테고리: ${categoryName}`,
    ...videos.map(
      (v) =>
        `[영상 ${v.index}] ${v.title}\n핵심 포인트:\n${v.summary_points.map((p) => `- ${p}`).join("\n") || "(없음)"}`,
    ),
  ].join("\n\n");

  const message = await anthropic().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as { sections: GuidebookSectionDraft[] };
    if (!Array.isArray(parsed.sections)) return [];
    return parsed.sections.filter((s) => s.title && s.content_markdown);
  } catch (err) {
    console.error("  가이드북 응답 파싱 실패:", err);
    return [];
  }
}
