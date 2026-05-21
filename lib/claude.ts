import { TaskArraySchema, type ExtractedTask } from "./taskSchema";

type ClaudeResponse = {
  content: Array<{ text: string }>;
};

export async function extractTasksFromTranscript(
  transcript: string
): Promise<ExtractedTask[]> {
  const systemPrompt =
    "Extract ALL actionable tasks from this voice memo. Return JSON array only. No prose.";

  const userPrompt = `Transcript: ${transcript}

Extract tasks with:
- title (required, short actionable title)
- description (optional, context. null if none)
- priority: "high" | "medium" | "low" | null
- due_date: ISO date YYYY-MM-DD or null (infer from natural language)
- category: string or null (e.g., "work", "personal", "health")
- tags: string[] (empty array if none)

Return ONLY a valid JSON array. No markdown. No code fences.`;

  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as ClaudeResponse;

  const textContent = data.content?.[0]?.text;
  if (!textContent) {
    throw new Error("No content in Claude response");
  }

  const cleaned = textContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse Claude response as JSON");
  }

  const result = TaskArraySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return result.data;
}
