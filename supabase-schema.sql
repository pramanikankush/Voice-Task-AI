-- Run this in Supabase SQL Editor

-- Recordings table
CREATE TABLE recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  audio_url text NOT NULL,
  transcript text,
  duration_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- Tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid REFERENCES recordings ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  priority text CHECK (priority IN ('high', 'medium', 'low')),
  due_date date,
  category text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  created_at timestamptz DEFAULT now()
);

-- Indexes for task queries
CREATE INDEX idx_tasks_recording_id ON tasks(recording_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Enable full-text search on tasks
ALTER TABLE tasks ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for recordings
CREATE POLICY "Users can view own recordings"
  ON recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
  ON recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for tasks (join-based via recording ownership)
CREATE POLICY "Users can view own task"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = tasks.recording_id
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = tasks.recording_id
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = tasks.recording_id
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recordings
      WHERE recordings.id = tasks.recording_id
      AND recordings.user_id = auth.uid()
    )
  );

-- Enable Realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recordings');
