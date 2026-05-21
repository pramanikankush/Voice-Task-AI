# Voice Tasks — Project Documentation

## Section A: Architecture

### System Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Browser   │ ──► │ Next.js Server   │ ──► │  OpenAI Whisper  │ ──► │  Claude AI   │
│ (React App) │ ◄── │ Actions          │ ◄── │  (transcription) │ ◄── │ (extraction) │
└──────┬──────┘     └────────┬─────────┘     └──────────────────┘     └──────────────┘
       │                     │
       ▼                     ▼
┌──────────────┐    ┌────────────────┐
│  Supabase    │    │  Supabase      │
│  Realtime    │    │  Storage/DB    │
│  (live sync) │    │  (audio +      │
└──────────────┘    │   tasks data)  │
                    └────────────────┘
```

### Database Schema

```
recordings
├── id: uuid PK (gen_random_uuid)
├── user_id: uuid FK → auth.users
├── audio_url: text
├── transcript: text
├── duration_seconds: int
└── created_at: timestamptz

tasks
├── id: uuid PK (gen_random_uuid)
├── recording_id: uuid FK → recordings (CASCADE)
├── title: text NOT NULL
├── description: text
├── priority: enum (high|medium|low)
├── due_date: date
├── category: text
├── tags: text[]
├── status: text DEFAULT 'pending'
├── search_vector: tsvector (GIN indexed)
└── created_at: timestamptz
```

### Indexes

| Table | Index | Type |
|-------|-------|------|
| recordings | user_id | B-tree |
| recordings | created_at DESC | B-tree |
| tasks | recording_id | B-tree |
| tasks | status | B-tree |
| tasks | priority | B-tree |
| tasks | category | B-tree |
| tasks | due_date | B-tree |
| tasks | created_at DESC | B-tree |
| tasks | search_vector | GIN |

### Audio Pipeline

```
MediaRecorder (browser)
    → audio/webm;codecs=opus chunks (1s intervals)
    → Blob assembled on stop
    → FormData → Server Action
    → Supabase Storage (recordings bucket)
    → OpenAI Whisper API (transcription)
    → Claude API (task extraction)
    → Supabase DB (tasks table)
    → Realtime push to UI
```

## Section B: How Everything Works

### MediaRecorder API

The MediaRecorder API captures audio from the user's microphone. The preferred MIME type is `audio/webm;codecs=opus` for broad browser support (Chrome, Firefox). If unsupported, falls back to `audio/webm`. Data is emitted in 1-second chunks via the `timeslice` parameter for progressive upload. Max recording duration is 5 minutes (300,000ms) enforced by a client-side timer.

### Whisper API Integration

Audio blobs are uploaded to Supabase Storage then transcribed via OpenAI Whisper. The API call uses `model: "whisper-1"` with English language hint. Whisper accepts webm/opus audio, returns plain text transcript. File format requirements: max 25MB, common audio formats supported (mp3, mp4, mpeg, mpga, m4a, wav, webm).

### Claude Structured Output

Claude receives a system prompt enforcing JSON-only array output and the transcript as user message. The extraction prompt asks for title, description, priority, due_date, category, and tags per task. Priority is inferred from urgency keywords ("urgent" → high, "ASAP" → high, "someday" → low). Due dates from natural language ("next Tuesday" → ISO date). Categories from domain keywords ("work", "grocery" → "personal"). Tags from key entities.

### Supabase Realtime Subscription

```ts
supabase.channel("tasks-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, handler)
  .subscribe();
```

The subscription listens to INSERT, UPDATE, DELETE events and merges them into local state. Optimistic UI updates show changes immediately, then reconcile with server-confirmed data.

### Server Actions vs API Routes

Server Actions (Next.js 14+) handle all write operations (transcribe, extract tasks) because they run on the same origin, avoid extra API endpoint surface, and support progressive enhancement. API routes could be used for public webhook endpoints if needed. Server Actions are invoked directly from client components via `import` and provide typed responses.

## Section C: AI Prompt Engineering

### Task Extraction Prompt

**System:** "Extract ALL actionable tasks from this voice memo. Return JSON array only. No prose."

**User:** `Transcript: <transcript text here>`

**Schema:**

```json
[{ "title": string, "description": string|null, "priority": "high"|"medium"|"low"|null, "due_date": "YYYY-MM-DD"|null, "category": string|null, "tags": string[] }]
```

### Priority Inference Examples

| Natural Language | Priority |
|-----------------|----------|
| "urgent", "ASAP", "critical", "today" | high |
| "need to", "should", "this week" | medium |
| "someday", "maybe", "eventually" | low |

### Category Inference Examples

| Keyword | Category |
|---------|----------|
| "meeting", "email", "report", "client" | work |
| "grocery", "laundry", "cook" | personal |
| "doctor", "dentist", "workout" | health |

### Zod Validation Schema

```ts
export const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  priority: z.enum(["high", "medium", "low"]).nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
});
```

## Section D: Deployment & Scaling

### Vercel + Supabase Deployment Steps

1. Create Supabase project at supabase.com
2. Run `supabase-schema.sql` in Supabase SQL Editor
3. Create `recordings` storage bucket via Supabase Dashboard
4. Set environment variables in Vercel
5. Connect Vercel project to Git repository
6. Deploy: `vercel --prod`

### Environment Variables

| Variable | Source | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Yes |
| `OPENAI_API_KEY` | platform.openai.com/api-keys | Yes |
| `ANTHROPIC_API_KEY` | console.anthropic.com/settings/keys | Yes |

### Audio File Retention Policy

Audio files stored in `recordings` Supabase Storage bucket. Recommended: retain for 30 days, then delete via Supabase Storage lifecycle rules or cron job that removes files older than 30 days and orphaned DB rows.

### Cost Estimation (1,000 DAU)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Vercel Pro | $20 | 1,000 DAU within Pro limits |
| Supabase Pro | $25 | 8GB DB, 250GB bandwidth |
| OpenAI Whisper | ~$60 | $0.006/min, ~10min/user/mo |
| Claude API | ~$100 | ~10K tokens/user/mo |
| **Total** | **~$205** | |

## Section E: Interview Questions & Answers (25)

### 1. How does MediaRecorder API handle chunked recording?

MediaRecorder accepts a `timeslice` argument in `start()`. When set to 1000ms, it fires `ondataavailable` every second with a Blob chunk. This enables progressive upload and prevents memory issues with long recordings. Chunks are collected and assembled into a final Blob on `onstop`. The `audio/webm;codecs=opus` MIME type offers good compression and broad browser support (Chrome, Firefox, Edge).

```ts
const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
recorder.start(1000); // emit chunk every second
```

### 2. How does the Web Audio API power the waveform visualizer?

Web Audio API creates an AudioContext connected to the microphone stream via MediaStreamSource. An AnalyserNode with fftSize=256 provides real-time frequency/time-domain data. During each requestAnimationFrame loop, `getByteTimeDomainData()` returns 128 samples normalized to 0-255. These samples map to bar heights on the canvas, creating a responsive waveform.

```ts
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const data = new Uint8Array(analyser.frequencyBinCount);
// In animation loop: analyser.getByteTimeDomainData(data);
// Map data[i] / 128 to bar heights on canvas
```

### 3. How does Whisper ASR work internally?

Whisper is a transformer-based encoder-decoder model trained on 680k hours of multilingual audio. Audio is resampled to 16kHz, split into 30-second windows, and converted to log-Mel spectrograms. The encoder processes each window; the decoder generates text tokens autoregressively. The `whisper-1` API endpoint handles file upload, preprocessing, inference, and returns transcribed text.

### 4. How to ensure structured JSON output from Claude?

The strategy uses: (1) System prompt explicitly stating "Return JSON array only. No prose." (2) User prompt with the required schema fields and types. (3) Post-processing that strips any markdown code fences. (4) Zod schema validation to catch malformed or missing fields. This layered approach handles Claude's occasional text-wrapping or structure deviations.

```ts
const cleaned = textContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const result = TaskArraySchema.safeParse(JSON.parse(cleaned));
```

### 5. How does Supabase Realtime subscription pattern work?

Supabase Realtime uses PostgreSQL replication slots. When a table is added to the `supabase_realtime` publication, every INSERT, UPDATE, or DELETE on that table generates a WAL (Write-Ahead Log) entry. The Realtime server listens to these WAL changes and pushes them to subscribed WebSocket clients. The client-side SDK manages reconnection, deduplication, and channel lifecycle.

### 6. When to use Server Actions vs API Routes?

Server Actions handle mutations called directly from client components. They run server-side with full environment access, support progressive enhancement, and share the same origin (no CORS). API Routes are better for public webhooks, third-party integrations, or endpoints consumed by non-React clients. For this app, transcribe and extraction actions are Server Actions.

### 7. How does PostgreSQL full-text search work?

Full-text search converts text into tsvector (lexeme tokens) and queries using tsquery. The `search_vector` column is a generated column using `to_tsvector('english', title || ' ' || description)`. The GIN index accelerates `search_vector @@ plainto_tsquery('english', query)` queries. This supports stemming, stop-word elimination, and ranked results.

```sql
ALTER TABLE tasks ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED;
CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);
```

### 8. How to make drag-and-drop accessible?

dnd-kit supports keyboard accessibility via `KeyboardSensor` and `KeyboardCoordinateGetter`. Screen reader announcements via `AccessibilityDescription` prop. Sortable items need `role="button"`, `tabIndex={0}`, and `aria-grabbed` attribute. Focus management after drag completes ensures keyboard users can continue navigation from the dropped position.

### 9. Can PWAs record audio in the background?

Background audio recording is limited. The MediaRecorder API pauses when the tab is backgrounded on most mobile browsers (Chrome iOS, Safari). On Android Chrome, `MediaRecorder` continues recording if the page is alive but may be throttled. Service Workers can't access `getUserMedia`, so background recording isn't fully reliable. Best approach: warn users to stay on the tab during recording.

### 10. How to render waveforms on canvas?

The AnalyserNode provides frequency data sampled at the canvas resolution. Each bar represents a frequency bin. The `getByteTimeDomainData()` method returns 0-255 values where 128 is silence. Bars are drawn using `ctx.fillRect()` with dynamic height proportional to the time-domain amplitude, creating a real-time visualizer.

```ts
analyser.getByteTimeDomainData(dataArray);
ctx.clearRect(0, 0, canvas.width, canvas.height);
for (let i = 0; i < barCount; i++) {
  const barHeight = (dataArray[i] / 128) * (canvas.height / 2);
  ctx.fillRect(i * (barWidth + 2), canvas.height / 2 - barHeight / 2, barWidth, barHeight);
}
```

### 11. How does JWT auth work with Supabase?

Supabase Auth issues JWTs on sign-in. The client-side anon key has limited privileges (RLS-controlled). The service_role key bypasses RLS for server-side operations. JWTs contain user ID (sub claim) and role. Server Actions use the service_role key for DB writes. RLS policies verify `auth.uid()` matches `recordings.user_id` to enforce access control.

### 12. How do Row Level Security policies work?

RLS policies are SQL expressions checked on every table operation. For `recordings`, the policy `USING (auth.uid() = user_id)` ensures users only see their own data. For `tasks`, a subquery checks the recording's user_id: `EXISTS (SELECT 1 FROM recordings WHERE recordings.id = recording_id AND recordings.user_id = auth.uid())`. This ensures task access is derived from recording ownership.

### 13. How to implement optimistic UI with rollback?

Optimistic updates apply changes immediately to local state, then sync with the server. If the server rejects the change, roll back to the previous state. In this app, task status changes are applied to React state instantly, then a Server Action is called. On failure, the Realtime subscription will push the original state back, effectively rolling back.

### 14. How to handle LLM JSON parsing failures?

Claude occasionally wraps JSON in markdown code fences or adds explanatory text. The mitigation: strip code fences and leading/trailing whitespace, then attempt `JSON.parse`. If that fails, use Zod's `safeParse` to provide detailed validation errors. The prompt explicitly forbids extra text. Final fallback: return an error to the user with "Re-extract" option.

### 15. What audio formats does Whisper support?

Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm (including opus codec). Max file size is 25MB. For this app, the browser's MediaRecorder outputs webm/opus which Whisper handles natively. No server-side transcoding is needed.

### 16. How does chunked upload strategy work?

Audio chunks from MediaRecorder are collected client-side into an array. When recording stops, all chunks are assembled via `new Blob(chunks, { type: mimeType })`. Supabase Storage doesn't natively support append-only writes for webm, so the final blob is uploaded as a single file. For very long recordings, multipart upload could split the blob before sending.

### 17. How does dnd-kit work internally?

dnd-kit uses a DndContext provider with sensors (PointerSensor, KeyboardSensor). Dragging activates collision detection algorithms (closestCorners, rectIntersection). SortableContext manages item reordering within containers. DragOverlay renders a floating preview during drag. The library uses CSS transforms for performance — no layout thrashing.

### 18. How to parse due dates from natural language?

Due date parsing is delegated to Claude. The extraction prompt instructs Claude to infer ISO dates from natural language ("next Friday", "in 3 days", "end of month"). Ambiguous references default to null. No client-side date parsing is needed; Claude handles the semantic understanding. Zod validates the ISO format on return.

### 19. How does Zod schema validation protect against bad LLM output?

Zod validates every field: `title` must be a non-empty string, `priority` must be one of exactly three values, `due_date` must match ISO date regex. The `safeParse` method returns detailed error messages for each violation. Invalid tasks are rejected with a clear error, preventing corrupt data in the database.

### 20. How to optimize AI API costs?

Strategies: (1) Enforce 5-minute max recording to limit Whisper duration. (2) Skip transcription if transcript already exists (re-extract). (3) Set Claude `max_tokens` to 4096 to bound token usage. (4) Cache repeated transcript extractions. (5) Run extraction only on user demand, not automatically. Estimated cost: ~$0.10 per recording (Whisper + Claude).

### 21. How does React Big Calendar integrate dates?

react-big-calendar uses a localizer pattern. `dateFnsLocalizer` adapts date-fns functions (format, parse, startOfWeek) to the calendar's internal date handling. Events are objects with `title`, `start`, and `end` Date properties. The `eventPropGetter` allows per-event styling. Tasks without due dates are excluded from the calendar view.

### 22. How does the Canvas-based star particle effect work?

The starfield uses a full-screen canvas behind the app. Stars are points with random (x, y) positions, sizes (1-3px), and alpha values. In an animation loop, stars slowly shift opacity to create a subtle twinkle effect. The canvas is rendered once on mount, with a very low refresh rate to minimize CPU usage.

### 23. How to handle browser compatibility for MediaRecorder?

Chrome and Firefox support `audio/webm;codecs=opus`. Safari supports `audio/mp4`. Feature detection checks supported MIME types via `MediaRecorder.isTypeSupported()` before creating the recorder. Fallback: use the first supported type from a prioritized list. Error handling catches permission denied, unsupported codec, and hardware failures.

```ts
const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
  ? "audio/webm;codecs=opus"
  : "audio/webm";
```

### 24. How does Supabase Auth integrate with the app?

Supabase Auth is configured in the Supabase dashboard (providers: email, Google, GitHub). The client-side `supabase` instance (anon key) handles sign-in/sign-out, session storage, and token refresh. Server-side Service Role key bypasses RLS for trusted Server Actions. The user ID from the session is sent as a FormData field in Server Actions for RLS-based operations.

### 25. How to ensure real-time sync reliability?

Realtime subscriptions auto-reconnect on WebSocket disconnection. The client library buffers missed events during offline periods. For full reliability: (1) Maintain a local task cache. (2) On Realtime reconnect, re-fetch the full task list. (3) Handle optimistic updates with rollback via the subscription. (4) Show a connection status indicator when offline.
