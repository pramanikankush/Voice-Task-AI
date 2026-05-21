"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { transcribeAudioGemini } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";

export async function transcribeRecording(formData: FormData) {
  const audioBlob = formData.get("audio") as Blob;
  const userId = formData.get("userId") as string;

  if (!audioBlob || !userId) {
    return { error: "Missing audio or userId" };
  }

  const recordingId = uuidv4();
  const filename = `${userId}/${recordingId}.webm`;

  try {
    const audioBuffer = await audioBlob.arrayBuffer();

    const sb = getSupabaseServer();

    // Self-healing: Check if 'recordings' bucket exists, if not create it
    const { data: buckets, error: listError } = await sb.storage.listBuckets();
    if (listError) {
      return { error: `Failed to check storage buckets: ${listError.message}` };
    }
    const bucketExists = buckets.some((b) => b.id === "recordings");
    if (!bucketExists) {
      const { error: createError } = await sb.storage.createBucket("recordings", {
        public: true, // Make it public so URL access works
        allowedMimeTypes: ["audio/webm", "audio/ogg", "audio/mp3", "audio/wav"],
      });
      if (createError) {
        return { error: `Failed to auto-create 'recordings' storage bucket: ${createError.message}` };
      }
    }

    const { error: uploadError } = await sb.storage
      .from("recordings")
      .upload(filename, audioBuffer, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = sb.storage
      .from("recordings")
      .getPublicUrl(filename);

    const transcript = await transcribeAudioGemini(audioBuffer, "audio/webm");

    const { error: insertError } = await sb.from("recordings").insert({
      id: recordingId,
      user_id: userId,
      audio_url: urlData.publicUrl,
      transcript,
      duration_seconds: formData.get("duration")
        ? parseInt(formData.get("duration") as string)
        : 0,
    });

    if (insertError) {
      return { error: `DB insert failed: ${insertError.message}` };
    }

    return { recordingId, transcript, audioUrl: urlData.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
