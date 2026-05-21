"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { extractTasksGemini } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";

type ExtractResult = {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  due_date: string | null;
  category: string | null;
  tags: string[];
  status: string;
  recording_id: string;
  created_at: string;
};

export async function extractTasks(
  transcript: string,
  recordingId: string
): Promise<{ tasks?: ExtractResult[]; error?: string }> {
  if (!transcript || !recordingId) {
    return { error: "Missing transcript or recordingId" };
  }

  try {
    const extracted = await extractTasksGemini(transcript);

    const tasksToInsert = extracted.map((t) => ({
      id: uuidv4(),
      recording_id: recordingId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_date: t.due_date,
      category: t.category,
      tags: t.tags,
      status: "pending",
    }));

    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("tasks")
      .insert(tasksToInsert)
      .select();

    if (error) {
      return { error: `Insert failed: ${error.message}` };
    }

    return { tasks: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<{ error?: string }> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from("tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function fetchTasks(): Promise<{
  tasks?: ExtractResult[];
  error?: string;
}> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { tasks: data ?? [] };
}

export async function fetchRecordings(): Promise<{
  recordings?: ExtractResult[];
  error?: string;
}> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("recordings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { recordings: data ?? [] };
}
