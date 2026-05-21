# Voice Tasks — Complete Interview Preparation Guide

> **Project**: Voice-to-task AI app — record voice memos, AI transcribes & extracts actionable tasks
> **Stack**: Next.js 16 · TypeScript · Tailwind v4 · Supabase · Gemini AI · OpenAI Whisper · dnd-kit · Framer Motion · react-big-calendar · Zod

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File-by-File Deep Dive](#2-file-by-file-deep-dive)
3. [Data Flow: Recording → Task on Screen](#3-data-flow-recording--task-on-screen)
4. [Component Tree & Relationships](#4-component-tree--relationships)
5. [Design Decisions & Hidden Whys](#5-design-decisions--hidden-whys)
6. [25 Interview Questions with Answers](#6-25-interview-questions-with-answers)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                   Browser (React 19)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌──────────────┐  │
│  │ Recorder │  │ TaskList │  │Board │  │RecordingHist │  │
│  │(Audio+   │  │(list)    │  │(kan- │  │(past recs + │  │
│  │Waveform) │  │          │  │ban)  │  │ re-extract)  │  │
│  └────┬─────┘  └────┬─────┘  └──┬───┘  └──────┬───────┘  │
│       │              │           │              │          │
│       ▼              ▼           ▼              ▼          │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Supabase Realtime (WebSocket)         │    │
│  │         tasks-changes → INSERT/UPDATE/DELETE       │    │
│  └──────────────────┬─────────────────────────────────┘    │
│                     │                                      │
└─────────────────────┼──────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│ Next.js 16   │ │Supabase  │ │  AI APIs │
│ Server       │ │ DB +     │ │ ┌──────┐ │
│ Actions      │ │ Storage  │ │ │Gemini│ │
│ ┌──────────┐ │ │          │ │ │Whispe│ │
│ │Transcribe│─┼─▶ Bucket: │ │ │Claude│ │
│ │Extract    │ │ │recordings│ │ └──────┘ │
│ │Tasks      │ │ │ Tables:  │ │          │
│ └──────────┘ │ │ tasks    │ │          │
│              │ │ recordgs │ │          │
└──────────────┘ └──────────┘ └──────────┘
```

### Key Architectural Choices

| Decision | Why |
|----------|-----|
| **Server Actions over API routes** | Same origin, no CORS, typed responses, progressive enhancement |
| **Gemini as primary AI** | Can both transcribe AND extract tasks (2-for-1), supports structured output schema natively |
| **Supabase Realtime** | Postgres WAL → WebSocket push → optimistic UI with server reconciliation |
| **3 view modes** | User preference: list (dense), kanban (worfklow), calendar (deadline view) |
| **Singleton Supabase clients** | Prevent multiple connections/instances; server client uses service_role key |
| **Tailwind v4 `@theme`** | Centralized design tokens — one source of truth for colors, fonts, spacing |

---

## 2. File-by-File Deep Dive

### 2.1 Config Files

#### `next.config.ts`
```ts
experimental: { serverActions: { bodySizeLimit: "10mb" } }
```
**Why**: Audio blobs can be large (5 min webm ~2-5MB). Default Next.js body limit is 1MB. 10MB allows headroom while remaining reasonable.
**Gotcha**: If audio exceeds 10MB, the server action silently fails with a 413 error — no graceful error handling for this in the UI.

#### `tsconfig.json`
- `strict: true` — catches null/undefined errors early
- `moduleResolution: "bundler"` — required for Next.js 16 + TypeScript 5
- `@/*` path alias → clean imports like `@/components/Recorder`
- `target: ES2017` — modern browsers, async/await native

#### `postcss.config.mjs`
```js
plugins: { "@tailwindcss/postcss": {} }
```
**Why**: Tailwind v4 uses `@tailwindcss/postcss` (not the old `tailwindcss` package). No `tailwind.config.js` — all config is in `globals.css` via `@theme`.

#### `eslint.config.mjs`
Uses `eslint-config-next/core-web-vitals` + TypeScript rules. Standard Next.js linting.

---

### 2.2 App Layer

#### `app/layout.tsx` — Root Layout
- **Metadata**: Title "Voice Tasks — Memos to Tasks", manifest link, favicon
- **Fonts**: Inter (body + display), JetBrains Mono (mono) — loaded via Google Fonts with preconnect
- **Header**: SVG microphone icon + "Voice Tasks" branding, sticky top with bottom border
- **Container**: `max-w-6xl`, `px-6 py-section` centered layout
- **themeColor**: `#f7f7f4` — warm off-white background
- **Gotcha**: Uses `lang="en"` hardcoded — no i18n support

#### `app/page.tsx` — Home Page
- **State management**:
  - `refreshTrigger` — increment to force task re-fetch
  - `viewMode` — toggles between list/kanban/calendar
  - `filters` — category, priority, dateRange, tag, search
- **`MOCK_USER_ID`** — hardcoded UUID `00000000-0000-0000-0000-000000000001`. **This means no auth is implemented**. Every user shares the same ID. This is the biggest gap for production readiness.
- **View mode switcher**: Segmented control (list/kanban/calendar) with smooth transitions
- **Filter fallthrough**: Search input → FilterBar dropdowns → filtered list

#### `app/manifest.ts` — PWA Manifest
- `display: "standalone"` — makes it installable as a PWA
- `theme_color: "#f54e00"` — matches the orange brand color
- **Limitation**: Only has favicon reference — no actual 192/512 PNG icons exist in `/public`. PWA install will fail.

#### `app/globals.css` — Tailwind Theme + Components
**Design token approach**: Everything defined in `@theme inline {}` block — 25+ color tokens, 3 font families, custom spacing, border radii.

| Token Group | Examples |
|-------------|----------|
| **Brand** | `primary: #f54e00` (orange), `primary-active: #d04200` (darker hover) |
| **Neutrals** | `ink`, `body`, `muted`, `muted-soft` — 6-level gray scale |
| **Surfaces** | `canvas`, `surface-card`, `surface-strong` — background hierarchy |
| **Semantic** | `error: #cf2d56`, `success: #1f8a65` |
| **Timeline** | `thinking`, `grep`, `read`, `edit`, `done` — colored accents |

**Component classes** (`.card`, `.btn-primary`, `.badge-pill`, etc.) are defined in `@layer components`. This is Tailwind's recommendation for reusable custom styles.

**Animation**: `.recording-pulse` (CSS keyframe opacity pulse), `.waveform-bar` (height oscillation) — both are CSS-only, no JS animation cost.

---

### 2.3 Types Layer — `types/task.ts`

```ts
type Priority = "high" | "medium" | "low";
type TaskStatus = "pending" | "in_progress" | "done";
type RecorderState = "idle" | "recording" | "processing" | "done";
type ViewMode = "kanban" | "list" | "calendar";
```

**Why separate types file?** Types are imported by components, hooks, lib, and actions. Centralizing avoids circular deps and makes the data contracts explicit.

**`FilterState`** is interesting — `dateRange` uses `{ from: string | null, to: string | null }` (ISO strings), not `Date` objects. This keeps serialization clean for URL params if needed later.

---

### 2.4 Lib Layer

#### `lib/supabase/client.ts` — Client-side Supabase
- **Singleton pattern**: `let client: SupabaseClient | null = null;` — only create once
- **Uses anon key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for browser, RLS-protected
- **No auth**: The client is created without any session. `getSupabase()` can be called from any component
- **Throw on missing env**: Clear error message if env vars not set

#### `lib/supabase/server.ts` — Server-side Supabase
- **Service role key**: `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for server actions
- **No session persistence**: `autoRefreshToken: false, persistSession: false` — server doesn't need user sessions, it trusts itself
- **Same singleton pattern** as client

#### `lib/taskSchema.ts` — Zod Validation
```ts
TaskSchema = z.object({
  title: z.string().min(1).catch("Untitled Task"),
  description: z.string().nullable().optional().catch(null),
  priority: z.enum(["high","medium","low"]).nullable().optional().catch(null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().catch(null),
  category: z.string().nullable().optional().catch(null),
  tags: z.array(z.string()).optional().catch([]),
});
```

**`.catch()` method**: Zod's `.catch()` provides fallback values when parsing fails. This is deliberate — if Claude/Gemini returns a malformed field, the schema doesn't fail entirely. It substitutes a safe default.
- Bad title → "Untitled Task"
- Bad priority → null (omitted)
- Missing tags → []

**Hidden why**: Without `.catch()`, a single malformed task would crash the entire extraction. `.catch()` makes validation resilient to LLM hallucinations.

#### `lib/gemini.ts` — Google Gemini Integration
Two functions:
1. **`transcribeAudioGemini()`**: Sends audio as base64 inline data to Gemini 2.5 Flash. Returns plain text.
2. **`extractTasksGemini()`**: Uses Gemini's **structured output** (`responseSchema`) — tells Gemini exactly what JSON shape to return. This is more reliable than prompt-only extraction.

**Key design choices**:
- `responseMimeType: "application/json"` + `responseSchema` — forces Gemini to return valid JSON matching the schema
- Zod `safeParse()` still runs after — defense in depth
- Model: `gemini-2.5-flash` — fast, cheap, good at structured output

**Gotcha**: Base64 encoding large audio (`Buffer.from(audioBuffer).toString("base64")`) increases size by ~33%. Long recordings may hit Gemini's token limit.

#### `lib/claude.ts` — Anthropic Claude Integration
- Raw `fetch()` call to Anthropic API (no SDK)
- System prompt: "Return JSON array only. No prose."
- Custom code fence stripping: `/^```(?:json)?\s*/i` and `/\s*```$/i`
- Zod validation after parse

**Hidden why**: Claude sometimes wraps JSON in markdown code blocks even when instructed not to. The regex stripping handles this as a defense layer.

#### `lib/whisper.ts` — OpenAI Whisper Integration
- Uses OpenAI SDK (not raw fetch)
- Creates a `File` object from ArrayBuffer for the API call
- Model: `whisper-1`, forced English language hint

**Why both Gemini AND Whisper?** The app uses Gemini for transcription by default (`transcribe.ts` import). Whisper and Claude are alternative implementations — they exist in the codebase but aren't currently wired to the UI. This suggests the app originally used Whisper+Claude, then migrated to Gemini (cheaper, single provider).

#### `lib/audio.ts` — Audio Utilities

**`AudioRecorder` class**:
- Wraps `MediaRecorder` API with typed callbacks
- Chunked recording: `mediaRecorder.start(1000)` — fires `ondataavailable` every second
- 5-minute max duration: `maxDurationMs: 300000` with `setTimeout` auto-stop
- MIME type detection: prefers `audio/webm;codecs=opus`, falls back to `audio/webm`
- Cleanup: stops all tracks, clears timers — prevents memory leaks

**`WaveformAnalyzer` class**:
- Web Audio API pipeline: `MediaStream → AudioContext → AnalyserNode → Canvas`
- `fftSize: 256` → 128 frequency bins → `frequencyBinCount = 128`
- Real-time visualization via `requestAnimationFrame` loop
- Gradient fill: orange (#f54e00) → purple (#7c3aed)
- 64 bars rendered — every other frequency bin (performance optimization)

**`blobToBase64()`**: Manual conversion (not using FileReader) — synchronous, simpler for server actions.

#### `lib/filters.ts` — Task Filtering
- `filterTasks()`: Client-side filter chain — search (title/desc/tags) → category → priority → tag → date range
- `getCategories()` / `getTags()`: Extract unique values from task array for dropdown options
- `priorityColor()` / `priorityLabel()`: Centralized mapping — change colors in one place

**Hidden why**: Filters are client-side (not SQL). This works because the app fetches ALL tasks once and filters locally. Good for small datasets (< 1000 tasks). Bad at scale — would need server-side pagination + filtering.

---

### 2.5 Server Actions — `app/actions/`

#### `transcribe.ts` — Transcribe Recording
```
1. Receive FormData (audio blob, userId, duration)
2. Get audio buffer
3. CHECK if 'recordings' Supabase Storage bucket exists
4. If not, CREATE bucket (self-healing deployment)
5. Upload audio to Supabase Storage
6. Get public URL
7. Transcribe via Gemini (transcribeAudioGemini)
8. Insert recording record into DB
9. Return { recordingId, transcript, audioUrl }
```

**Self-healing bucket creation**: If the `recordings` storage bucket doesn't exist (e.g., first deployment, schema.sql not run), the action auto-creates it. This is a smart DX touch but has security implications — the service_role key can create storage buckets.

**Error handling**: Returns `{ error: string }` instead of throwing. The `try/catch` catches all errors and returns them as structured objects. This is the recommended pattern for Server Actions.

#### `extract-tasks.ts` — Task Extraction & Management
- `extractTasks(transcript, recordingId)`:
  1. Call `extractTasksGemini(transcript)` — returns parsed + Zod-validated tasks
  2. Generate UUIDs for each task
  3. Bulk insert into `tasks` table
  4. Return inserted tasks with `.select()`
- `updateTaskStatus(taskId, status)`: Simple column update
- `fetchTasks()` / `fetchRecordings()`: Full table fetches ordered by `created_at DESC`

**Hidden why**: `fetchTasks()` has no pagination. For a real app, this would need `limit` + `offset` or cursor-based pagination.

---

### 2.6 Hooks

#### `hooks/useRealtimeTasks.ts` — Real-time Sync
Three responsibilities:
1. **Fetch initial data**: Calls `fetchTasks()` on mount and when `refreshTrigger` changes
2. **Subscribe to changes**: Supabase Realtime channel `tasks-changes` listening to all events on `tasks` table
3. **Optimistic updates**: `updateTaskOptimistic()` — useful for drag-and-drop status changes

**Reconciliation strategy**: When a Server Action updates a task, the optimistic UI shows the change immediately. The Realtime subscription then pushes the confirmed server state back. If they match, no visual flash. If they diverge, the server state wins.

**Cleanup**: `supabase.removeChannel(channel)` on unmount — prevents memory leaks and duplicate subscriptions.

**Gotcha**: If the WebSocket disconnects during an update, the local state may temporarily diverge from server state until reconnection.

#### `hooks/useRecorder.ts` — Recording State Machine
State transitions:
```
idle → recording → [processing] → done
                          ↓
                       idle (error)
```

- `durationInterval`: Polls elapsed time every 200ms (not 1000ms — smoother UI updates)
- `formatDuration(duration)`: Converts seconds to `m:ss` format
- Tracks remaining time: `maxDurationMs - elapsed`

**Why setState("processing") before stopping?** The processing state shows a spinner while the audio blob is being assembled and prepared for upload.

#### `hooks/useWaveform.ts` — Waveform Visualization
Two render modes:
1. **Live**: Uses `WaveformAnalyzer` with a MediaStream — real-time frequency bars during recording
2. **Static**: After recording stops, decodes the audio blob via `AudioContext.decodeAudioData()`, samples 128 evenly-spaced amplitude points, draws static waveform

**Hidden why**: The static waveform uses 128 bars (same as live), but the live mode only renders 64. The static mode can afford more because it's a one-time render, while live mode needs to hit 60fps.

---

### 2.7 Components

#### `app/page.tsx` — Main Orchestrator
- **Props drilling**: `tasks`, `onTasksChange`, `filters` flow down to children
- **AnimatePresence**: Wrap view mode transitions (list/kanban/calendar) with Framer Motion
- **Filter state**: Single `FilterState` object — partial updates via spread

#### `components/Recorder.tsx` — Recording UI
State machine-driven UI:
| State | UI |
|-------|-----|
| `idle` | Microphone button |
| `recording` | Red square stop button (with pulse animation) |
| `processing` | Spinning loader |
| `done` | "Extract Tasks" + "Discard" buttons |

**Call chain**:
```
handleStart → getUserMedia → startRecording()
handleStop → stopRecording() → stop stream tracks
handleExtract → transcribeRecording() → extractTasks() → onTasksExtracted()
```

**Microphone permission**: Requested in `handleStart`, not on mount. This is a UX best practice — don't ask for permissions until the user initiates the action.

**Error display**: Shows inline error text below the buttons.

**Gotcha**: `suppressHydrationWarning` on buttons — likely because of Framer Motion or server/client rendering differences.

#### `components/WaveformCanvas.tsx` — Audio Visualization
- Canvas element: 400×80 logical pixels, stretches full width via CSS
- Two `useEffect` hooks:
  1. Live: `stream + isRecording → WaveformAnalyzer.start()`
  2. Static: `audioBlob + !isRecording → drawStaticWaveform()`

**Cleanup**: On stream change or unmount, `analyzer.stop()` is called, which cancels the animation frame and closes the AudioContext.

**Hidden why**: The gradient (orange→purple) is recreated on every draw call in the live mode. This is intentional — `CanvasGradient` objects can't be cached between `clearRect` calls. It's a small allocation, not a performance concern.

#### `components/TaskBoard.tsx` — Kanban Board (dnd-kit)

**Column structure**: Three droppable columns — Pending, In Progress, Done — hardcoded as `COLUMNS` array.

**Drag-and-drop flow**:
1. `DndContext` wraps all columns
2. `PointerSensor` with `activationConstraint: { distance: 8 }` — prevents accidental drags on click
3. `closestCorners` collision detection — natural feel for column drops
4. `DragOverlay` shows a rotated preview card while dragging (CSS `rotate-3`)

**Status update on drop**:
```ts
if (activeTask.status !== overColumn.id) {
  updateTaskStatus(activeTask.id, overColumn.id);
  onTasksChange();
}
```

**Each column**: Contains a `useDroppable` (the column itself) + `SortableContext` (items within). This dual setup enables both moving between columns AND reordering within a column (though reorder within isn't persisted to DB).

**Hidden why**: Only status changes are persisted — not sort order. The `SortableContext` enables within-column reordering but the UI doesn't save the order. This is a half-implemented feature.

#### `components/TaskList.tsx` — List View
- Each row: checkbox circle, priority dot, title (strikethrough when done), description, badges, due date
- Click toggle: `pending ↔ done` (toggle doesn't allow `in_progress` from list view)
- Empty state: "No tasks match your filters"
- Framer Motion: layout animation + enter/exit transitions

**Hidden why**: The checkbox is a `button` element (not `input[type=checkbox]`) — necessary for custom styling and the SVG checkmark. It has `aria-label` for accessibility.

#### `components/TaskCalendar.tsx` — Calendar View
- Uses `react-big-calendar` with `date-fns` localizer
- Dynamic import: `date-fns/locale/en-US` is loaded asynchronously inside `useEffect` — code-splitting reduces bundle size
- Only tasks with `due_date` appear in the calendar
- Event color matches priority: high=red, medium=amber, low=green (via `priorityColor()`)
- Renders a loading placeholder while the locale loads

**Gotcha**: `onView={() => {}}` — empty handler prevents console warnings from react-big-calendar about missing handler.

#### `components/TaskBadges.tsx` — Badge Pills
- Shows: priority (colored), category (neutral), tags (up to 3 with "+N" overflow)
- Uses `priorityColor()` and `priorityLabel()` from filters lib

#### `components/FilterBar.tsx` — Filter Controls
- Three `CustomSelect` dropdowns: Category, Priority, Tag
- "Clear" button appears when any filter is active
- Generic `setFilter<K>` method with proper typing for partial filter updates

#### `components/SearchInput.tsx` — Search Field
- SVG search icon positioned absolutely
- Base input styled with `.text-input` class

#### `components/CustomSelect.tsx` — Custom Dropdown
- Full custom implementation (no third-party select library)
- Click outside detection via `mousedown` event listener
- Selected item highlighted with `bg-primary/10`
- Animated dropdown: `animate-in fade-in slide-in-from-top-1`
- Z-index management: 10 when closed, 50 when open (dropdown items get z-100)

**Hidden why**: Radix UI's `@radix-ui/react-select` is in package.json but this component doesn't use it. The custom select was probably built before adding Radix, or Radix was added for a different purpose.

#### `components/RecordingHistory.tsx` — Past Recordings
- Fetches last 20 recordings on mount and when `refreshTrigger` changes
- Each item shows: waveform thumbnail (random bars, not real data), date, duration, audio player, "Re-extract" button
- Expandable transcript via accordion pattern (click to expand)

**WaveformThumbnail**: Generates 20 random bars with random heights/opacities — purely decorative, no actual audio data. This is a deliberate simplification.

**Re-extract**: Calls `extractTasks()` again with the stored transcript — useful if the AI missed tasks the first time.

#### `components/TranscriptPanel.tsx` — Transcript Display
- Conditional render: returns `null` if `!isVisible || !transcript`
- Shows transcript text + extracted task list with green dots

---

### 2.8 Database — `supabase-schema.sql`

**Two tables**:
- `recordings`: id, user_id, audio_url, transcript, duration_seconds, created_at
- `tasks`: id, recording_id (FK CASCADE), title, description, priority (CHECK constraint), due_date, category, tags (text[]), status (CHECK), created_at

**Full-text search**: Generated column `search_vector` using `to_tsvector('english')` with GIN index. Currently not used in application code — it's infrastructure for future search features.

**RLS (Row Level Security)**:
- Recordings: Users see/insert only their own (WHERE `auth.uid() = user_id`)
- Tasks: Access derived from recording ownership (subquery join)
- Storage: Authenticated users can upload; anyone can view (public bucket)

**Realtime**: Only the `tasks` table is added to `supabase_realtime` publication. Recordings are not synced in real time — they're fetched on mount and refresh.

---

## 3. Data Flow: Recording → Task on Screen

```
1. USER CLICKS RECORD
   │
   ▼
2. getUserMedia({ audio: true }) ← browser permission dialog
   │
   ▼
3. MediaRecorder starts with timeslice=1000ms
   └── fires ondataavailable every 1s with audio chunks
   └── max 5 minutes (300s), auto-stop
   │
   ▼
4. USER CLICKS STOP
   │
   ▼
5. Blob assembled from all chunks
   └── state → "done"
   └── waveform switches to static render
   │
   ▼
6. USER CLICKS "EXTRACT TASKS"
   │
   ▼
7. Server Action: transcribeRecording(formData)
   ├── Check/create "recordings" storage bucket (self-healing)
   ├── Upload audio blob to Supabase Storage
   ├── Get public URL
   ├── Gemini transcribeAudioGemini(buffer) → transcript
   └── Insert into recordings table
   │
   ▼
8. Server Action: extractTasks(transcript, recordingId)
   ├── Gemini extractTasksGemini(transcript)
   │   └── responseSchema forces JSON structure
   │   └── Zod validates + sanitizes (.catch fallbacks)
   ├── Generate UUID per task
   ├── Bulk insert into tasks table
   └── Return inserted tasks
   │
   ▼
9. Supabase Realtime pushes INSERT events to subscribed clients
   │
   ▼
10. useRealtimeTasks hook receives payload
    └── setTasks(prev => [newTask, ...prev])
    │
    ▼
11. React re-renders current view mode (list/kanban/calendar)
    └── Tasks appear with badges, priority colors, etc.
```

---

## 4. Component Tree & Relationships

```
RootLayout (layout.tsx)
└── Home (page.tsx)
    ├── Recorder
    │   ├── WaveformCanvas
    │   └── RecordingTimer
    ├── SearchInput
    ├── FilterBar
    │   └── CustomSelect (×3)
    ├── AnimatePresence
    │   ├── TaskList
    │   │   └── TaskBadges
    │   ├── TaskBoard (DndContext)
    │   │   ├── Column → SortableTaskCard → TaskBadges
    │   │   ├── Column → SortableTaskCard → TaskBadges
    │   │   ├── Column → SortableTaskCard → TaskBadges
    │   │   └── DragOverlay → TaskBadges
    │   └── TaskCalendar
    └── RecordingHistory
        └── WaveformThumbnail (×N)
```

State ownership:
| State | Owner | Passed to |
|-------|-------|-----------|
| `tasks` | useRealtimeTasks hook | TaskBoard, TaskList, TaskCalendar, FilterBar |
| `viewMode` | page.tsx | Segmented control, AnimatePresence |
| `filters` | page.tsx | FilterBar, SearchInput, filteredTasks |
| `recorder state` | useRecorder hook | Recorder |
| `stream` | Recorder | WaveformCanvas |
| `recordingId` | Server Action return | extractTasks |

---

## 5. Design Decisions & Hidden Whys

### Why Server Actions instead of API routes?
Server Actions (Next.js 14+) are called directly from client components like functions. They share the origin (no CORS), support progressive enhancement, and have typed returns. API routes would add unnecessary abstraction — the only client is the React app itself.

### Why Gemini over Whisper+Claude?
Gemini 2.5 Flash handles both transcription and structured task extraction in one SDK. This reduces:
- API provider count (Supabase + Gemini instead of Supabase + OpenAI + Anthropic)
- Token costs (Gemini Flash is cheaper than Whisper + Claude Sonnet)
- Latency (one round-trip instead of two)

The Whisper and Claude modules still exist as fallback options if Gemini fails or is replaced.

### Why `.catch()` on every Zod field?
LLM JSON output is unpredictable. A single hallucinated field shouldn't crash the entire task array. `.catch()` provides sensible defaults:
- Bad title → "Untitled Task" (user can edit later)
- Bad enum → null (omitted from UI)
- Missing tags → [] (empty, no crash)

This is "tolerant reader" pattern — be strict in what you send, liberal in what you accept.

### Why no authentication?
The `MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"` means all users share the same identity. This was omitted for development speed. The schema has RLS policies ready, but the app never sets `auth.uid()` because there's no login flow.

### Why 64 bars in live mode but 128 in static mode?
Performance. The live mode renders on every `requestAnimationFrame` (potentially 60fps). Fewer bars = less canvas drawing = smoother. The static mode renders once, so it can afford double the resolution.

### Why self-healing bucket creation?
When deploying to a fresh Supabase instance, manually creating the storage bucket is a common friction point. Auto-creating it in the Server Action reduces setup steps from "create bucket in dashboard" to "run SQL + deploy". The tradeoff: the service_role key gets bucket creation capability.

### Why is sort order not persisted?
The `SortableContext` in TaskBoard allows within-column reordering, but the order isn't saved to the database. This is a half-implemented feature — the UI supports it but the backend doesn't. A `sort_order` column would be needed.

### Why `suppressHydrationWarning` on buttons?
Likely because of Framer Motion's `AnimatePresence` wrapping, which may render different HTML on server vs. client. The `suppressHydrationWarning` prevents React warnings but masks an underlying SSR mismatch.

### Why `onView={() => {}}` in Calendar?
`react-big-calendar` requires an `onView` handler. Passing an empty arrow function suppresses React warnings about missing handlers. The app doesn't respond to view changes.

---

## 6. 25 Interview Questions with Answers

### Architecture & Design

**Q1: Why did you choose Server Actions over API routes?**

Server Actions let us call backend logic directly from client components without HTTP serialization overhead or CORS considerations. They're typed end-to-end via TypeScript imports. For a single-client app like this, API routes add unnecessary abstraction. Server Actions also support progressive enhancement — they work even if JavaScript is partially loaded.

**Q2: How does real-time sync work? What happens if the WebSocket disconnects?**

Supabase Realtime uses PostgreSQL's WAL (Write-Ahead Log). When a row changes, the WAL entry is pushed to connected WebSocket clients. The `@supabase/supabase-js` client auto-reconnects on disconnect and replays missed events. During disconnection, optimistic UI updates show changes locally. On reconnect, a full re-fetch syncs the state, and the server-confirmed data overwrites any optimistic divergence.

**Q3: The app has both Gemini and Claude/Whisper. Why?**

The app originally used OpenAI Whisper (transcription) + Anthropic Claude (extraction). Gemini was added as a migration path because Gemini 2.5 Flash handles both tasks in one call with native structured output (`responseSchema`). This reduces provider count, cost, and latency. The old modules remain as fallbacks — the `transcribe.ts` action currently uses Gemini; Whisper/Claude are unused.

**Q4: How would you add authentication to this app?**

Add Supabase Auth with a login page (email/password or social providers). Replace `MOCK_USER_ID` with `(await supabase.auth.getUser()).data.user.id`. The RLS policies already enforce `auth.uid() = user_id` — they're just inactive because no session exists. Server Actions would need the user ID from the session (not FormData). This is ~50 lines of work.

**Q5: How do you handle AI output errors? What if Gemini returns garbage?**

Defense in depth: (1) Gemini's `responseSchema` forces JSON structure at the API level. (2) Custom regex strips markdown code fences. (3) Zod's `TaskArraySchema.safeParse()` validates every field. (4) `.catch()` fallbacks provide safe defaults for malformed fields. (5) The final fallback returns `{ error: string }` to the UI with a "Try Again" option.

**Q6: Why is there no pagination for tasks?**

The app fetches all tasks and filters client-side. For a personal to-do app with <500 tasks, this is fine. At scale, you'd add cursor-based pagination with SQL `LIMIT`/`OFFSET` and server-side filtering via the `search_vector` GIN index that's already defined in the schema but unused.

**Q7: How would you add drag-and-drop sort order persistence?**

Add an `integer sort_order` column to the `tasks` table. On each drag end, send all task IDs in their new order to a Server Action that updates `sort_order` in a batch. Use `supabase.from("tasks").upsert()` with the IDs and new order values. The initial fetch would `order("sort_order")`.

### Technical Deep Dive

**Q8: Explain the MediaRecorder setup. Why `start(1000)`?**

`mediaRecorder.start(1000)` fires `ondataavailable` every 1 second with a chunk. This enables progressive upload (future feature) and prevents memory issues with long recordings — without timeslice, the entire recording is delivered as one blob on `stop()`, which can be large. The `audio/webm;codecs=opus` MIME type offers good compression (~64kbps) and wide browser support.

**Q9: How does the waveform visualization work? What's the difference between live and static modes?**

Live mode: `MediaStream → AudioContext → AnalyserNode (fftSize=256) → getByteTimeDomainData()` in a `requestAnimationFrame` loop → draw 64 bars on canvas. Static mode: After recording, `AudioContext.decodeAudioData()` parses the full blob → sample 128 evenly-spaced amplitude points → draw once. Live uses 64 bars for 60fps performance; static uses 128 because it renders once.

**Q10: What's the significance of `fftSize: 256`?**

`fftSize` determines the frequency resolution. `256` gives 128 frequency bins (`frequencyBinCount = fftSize / 2`). Higher values (512, 1024) give more detail but more computation. 256 is a good balance for a voice-focused waveform — enough resolution for visual feedback without tanking performance.

**Q11: Why Zod `.catch()` instead of `.optional()` or `.nullable()`?**

`.catch()` provides a fallback value when validation fails, not just when a value is missing. If Gemini returns `"priority": "super-high"` (invalid enum), `.optional()` would fail. `.catch(null)` substitutes `null` and continues. This makes the system resilient to LLM hallucinations while still enforcing the schema.

**Q12: Explain the self-healing storage bucket pattern.**

```ts
const buckets = await sb.storage.listBuckets();
if (!buckets.some(b => b.id === "recordings")) {
  await sb.storage.createBucket("recordings", { public: true });
}
```
Instead of failing with "bucket not found" on first deployment, the action checks and creates it. This eliminates a manual setup step but requires the service_role key to have bucket creation permissions — a minor security consideration.

**Q13: How does `useRealtimeTasks` prevent duplicate task entries?**

The INSERT handler checks `!prev.some((t) => t.id === record.id)` before adding. This prevents duplicates when the optimistic insert (from the Server Action return) arrives before the Realtime push. If Realtime pushes an INSERT for a task already in state, it's ignored.

**Q14: What happens if two users record at the same time?**

They'd share the same `MOCK_USER_ID`, creating data interleaving. This is the primary reason auth is needed — there's no user isolation. Without auth, user A's tasks appear in user B's view immediately via Realtime.

**Q15: Why is the search_vector column generated and stored?**

```sql
GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED;
```
STORED means the tsvector is computed on INSERT/UPDATE and persisted. This avoids recomputing on every query. The GIN index accelerates `@@` (tsquery match) operations. The field is currently unused — it's infrastructure for future full-text search.

**Q16: Explain the RLS policy for tasks. Why use a subquery instead of a direct user_id column?**

Tasks don't have a `user_id` column — they reference `recording_id`, and recordings have `user_id`. The RLS subquery joins through:
```sql
EXISTS (SELECT 1 FROM recordings WHERE id = recording_id AND user_id = auth.uid())
```
This enforces data isolation without duplicating `user_id` on the tasks table (denormalization). It's normalized and guarantees referential integrity.

### Hidden Whys

**Q17: The `.catch()` on `tags` is `z.array(z.string()).optional().catch([])` — why not just `.default([])`?**

`.default([])` only applies when the value is `undefined`. `.catch([])` applies when validation fails for ANY reason — `undefined`, `null`, `"not-an-array"`, `[1, 2, 3]` (non-string). This is more robust because LLMs are unpredictable.

**Q18: Why 3 separate view modes instead of just one?**

Different users have different mental models: list (dense, scannable), kanban (workflow state), calendar (deadline-driven). Offering all three with AnimatePresence transitions makes the app flexible without adding backend complexity — the view mode is purely client-side.

**Q19: Why does the Kanban board have DragOverlay with `rotate-3`?**

The slight rotation provides visual feedback that the card is "lifted" from its position. Combined with the shadow (`shadow-lg`), it creates a natural depth cue. This is a subtle UX touch that makes drag-and-drop feel more physical.

**Q20: Why the hardcoded `onView={() => {}}` in react-big-calendar?**

`react-big-calendar` throws a React warning if `onView` is not provided (it expects a handler for view changes). The empty function silences this. The app doesn't need to respond to view changes because all logic is in the localizer and event data.

**Q21: Why does RecordingHistory only show 20 recordings?**

`.limit(20)` prevents unbounded data fetching. Recordings are large objects (containing transcripts). Fetching hundreds would be slow. If users need older recordings, a "Load More" button with cursor-based pagination would be the next step.

**Q22: Why does `WaveformThumbnail` generate random bars instead of analyzing the actual audio?**

Analysis would require decoding the audio blob for every history item — expensive for 20 items. Random bars provide a consistent decorative element with zero computation cost. They look similar enough to real waveforms at thumbnail size.

**Q23: Why are `extract-tasks.ts` and `transcribe.ts` separate Server Actions instead of one?**

Separation of concerns: transcription is upload+AI, extraction is AI+DB write. Keeping them separate allows:
- Retrying extraction without re-uploading/re-transcribing
- Calling extraction independently (Re-extract button)
- Better error isolation (transcription can succeed, extraction can fail)

### Production Readiness

**Q24: What would it take to make this production-ready?**

1. **Auth**: Implement Supabase Auth, remove `MOCK_USER_ID`
2. **Error boundaries**: Wrap components in React error boundaries
3. **Pagination**: Server-side task loading with cursor-based pagination
4. **Loading states**: Skeleton loaders for initial data fetch
5. **Offline support**: Service worker + IndexedDB caching
6. **Audio cleanup**: Cron job to delete old recordings from storage
7. **Rate limiting**: Prevent abuse of AI API calls
8. **Sort order**: Add `sort_order` column and persist drag-and-drop reordering
9. **Tests**: Unit tests for Zod schemas + filters, integration tests for Server Actions
10. **Monitoring**: Error tracking, API cost tracking

**Q25: How would you reduce AI API costs?**

1. **Cache transcripts**: If the same audio is uploaded, skip transcription (hash-based dedup)
2. **Batch extraction**: Process multiple recordings in one API call during low-usage periods
3. **Shorter recordings**: Reduce max duration from 5 min to 2 min
4. **Use Gemini Flash**: Already done — cheaper than Pro models
5. **Client-side validation before AI**: Reject empty/short recordings before hitting API
6. **Throttle re-extracts**: Rate-limit the "Re-extract" button to once per 30 seconds
