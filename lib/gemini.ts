import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { TaskArraySchema, type ExtractedTask } from "./taskSchema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Transcribe audio using Gemini 2.5 Flash inline audio.
 * Accepts raw ArrayBuffer + MIME type, returns plain transcript text.
 */
export async function transcribeAudioGemini(
  audioBuffer: ArrayBuffer,
  mimeType: string = "audio/webm"
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Audio,
        mimeType,
      },
    },
    "Transcribe this audio recording accurately. Return ONLY the transcription text. No commentary, labels, or formatting.",
  ]);

  const text = result.response.text().trim();
  if (!text) {
    throw new Error("Gemini returned empty transcription");
  }
  return text;
}

/**
 * Extract actionable tasks from a transcript using Gemini 2.5 Flash
 * with structured JSON output via responseSchema.
 */
export async function extractTasksGemini(
  transcript: string
): Promise<ExtractedTask[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        description: "List of actionable tasks extracted from the transcript",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: "Short actionable task title",
              nullable: false,
            },
            description: {
              type: SchemaType.STRING,
              description: "Additional context or details. Null if none.",
              nullable: true,
            },
            priority: {
              type: SchemaType.STRING,
              format: "enum",
              description: "Urgency level",
              enum: ["high", "medium", "low"],
              nullable: true,
            } as const,
            due_date: {
              type: SchemaType.STRING,
              description:
                "ISO date YYYY-MM-DD inferred from natural language. Null if unclear.",
              nullable: true,
            },
            category: {
              type: SchemaType.STRING,
              description:
                'Domain category, e.g. "work", "personal", "health". Null if unclear.',
              nullable: true,
            },
            tags: {
              type: SchemaType.ARRAY,
              description: "Relevant keyword tags. Empty array if none.",
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ["title", "tags"],
        },
      },
    },
  });

  const prompt = `Extract ALL actionable tasks from this voice memo transcript.

Transcript: ${transcript}

Rules:
- Every concrete action item becomes a task
- Infer priority from urgency words ("urgent"/"ASAP" → high, "need to"/"should" → medium, "someday"/"maybe" → low)
- Infer due_date from natural language ("next Tuesday" → ISO date, "in 3 days" → ISO date)
- Infer category from domain ("meeting"/"email" → work, "grocery"/"laundry" → personal, "doctor" → health)
- Extract key entities as tags`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  if (!text) {
    throw new Error("Gemini returned empty extraction response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  // Validate with Zod for safety
  const validated = TaskArraySchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Validation error: ${validated.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return validated.data;
}
