export type Priority = "high" | "medium" | "low";

export type TaskStatus = "pending" | "in_progress" | "done";

export type Task = {
  id: string;
  recording_id: string;
  title: string;
  description: string | null;
  priority: Priority | null;
  due_date: string | null;
  category: string | null;
  tags: string[];
  status: TaskStatus;
  created_at: string;
};

export type Recording = {
  id: string;
  user_id: string;
  audio_url: string;
  transcript: string | null;
  duration_seconds: number;
  created_at: string;
};

export type RecorderState = "idle" | "recording" | "processing" | "done";

export type ViewMode = "kanban" | "list" | "calendar";

export type FilterState = {
  category: string | null;
  priority: Priority | null;
  dateRange: { from: string | null; to: string | null };
  tag: string | null;
  search: string;
};
