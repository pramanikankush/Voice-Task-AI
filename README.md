# Voice Tasks

Convert voice memos into structured, categorized tasks using AI.

Record audio in the browser → Gemini transcribes → Gemini extracts actionable tasks → tasks appear in real-time across list, kanban, and calendar views.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Storage + Realtime) |
| AI | Google Gemini 2.5 Flash (transcription + task extraction) |
| UI | Radix UI, Framer Motion, dnd-kit, react-big-calendar |
| Validation | Zod |

---

## Features

- **Voice recording** — MediaRecorder API with 5-min limit, chunked recording, waveform visualization
- **AI pipeline** — Record → upload to Supabase Storage → Gemini transcribes → Gemini extracts structured tasks
- **3 view modes** — List (dense), Kanban (drag-and-drop workflow), Calendar (deadline view)
- **Real-time sync** — Supabase Realtime pushes task changes to all connected clients
- **Filter & search** — By category, priority, tags, date range, and full-text search
- **Recording history** — Past recordings with expandable transcripts and re-extraction
- **Self-healing storage** — Auto-creates storage bucket on first deploy
- **PWA ready** — Manifest with standalone display support

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/pramanikankush/Voice-Task-AI.git
cd voice-tasks
npm install
```

### 2. Set up environment

Create `.env.local`:

```env
# Supabase (from your project dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini (from aistudio.google.com/apikey)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the SQL Editor
3. That's it — the storage bucket auto-creates on first upload

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
├── app/
│   ├── actions/           # Server Actions (transcribe, extract tasks)
│   ├── globals.css        # Tailwind theme + component classes
│   ├── layout.tsx         # Root layout with header + fonts
│   ├── manifest.ts        # PWA manifest
│   └── page.tsx           # Main page orchestrator
├── components/
│   ├── Recorder.tsx       # Voice recording UI + state machine
│   ├── WaveformCanvas.tsx # Live & static waveform visualization
│   ├── RecordingTimer.tsx # Timer with pulse indicator
│   ├── TaskBoard.tsx      # Kanban with dnd-kit drag-and-drop
│   ├── TaskList.tsx       # List view with toggle-complete
│   ├── TaskCalendar.tsx   # Calendar view (react-big-calendar)
│   ├── TaskBadges.tsx     # Priority/category/tag pills
│   ├── FilterBar.tsx      # Dropdown filters
│   ├── SearchInput.tsx     # Search field
│   ├── CustomSelect.tsx   # Custom dropdown component
│   ├── RecordingHistory.tsx # Past recordings + re-extract
│   └── TranscriptPanel.tsx # Transcript + extracted tasks display
├── hooks/
│   ├── useRealtimeTasks.ts # Supabase Realtime subscription
│   ├── useRecorder.ts      # MediaRecorder state management
│   └── useWaveform.ts      # Waveform visualization logic
├── lib/
│   ├── audio.ts           # AudioRecorder + WaveformAnalyzer classes
│   ├── gemini.ts          # Gemini AI (transcribe + extract)
│   ├── claude.ts          # Claude AI (fallback extraction)
│   ├── whisper.ts         # OpenAI Whisper (fallback transcription)
│   ├── taskSchema.ts      # Zod validation schemas
│   ├── filters.ts         # Task filtering utilities
│   └── supabase/          # Client + server Supabase instances
├── types/
│   └── task.ts            # Core TypeScript types
└── supabase-schema.sql    # Full DB schema + RLS + indexes
```

---

## Architecture

```
Browser (React) → Server Action → Supabase Storage (audio)
                                       ↓
                                  Gemini API (transcription)
                                       ↓
                                  Gemini API (task extraction)
                                       ↓
                                  Supabase DB (tasks table)
                                       ↓
                                  Supabase Realtime → Browser UI
```

All write operations go through Next.js Server Actions (same origin, typed responses, no CORS). The client subscribes to Postgres changes via Supabase Realtime WebSocket for live updates.

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard → Settings → API |
| `GEMINI_API_KEY` | Yes | aistudio.google.com/apikey |

---

## License

MIT
