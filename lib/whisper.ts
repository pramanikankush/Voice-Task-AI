import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  filename: string
): Promise<string> {
  const file = new File([audioBuffer], filename, {
    type: "audio/webm",
  });

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
  });

  return response.text;
}
