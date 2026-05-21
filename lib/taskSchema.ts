import { z } from "zod";

export const TaskSchema = z.object({
  title: z.string().min(1, "Title is required").catch("Untitled Task"),
  description: z.string().nullable().optional().catch(null).transform(v => v ?? null),
  priority: z.enum(["high", "medium", "low"]).nullable().optional().catch(null).transform(v => v ?? null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().catch(null).transform(v => v ?? null),
  category: z.string().nullable().optional().catch(null).transform(v => v ?? null),
  tags: z.array(z.string()).optional().catch([]).transform(v => v ?? []),
});

export const TaskArraySchema = z.array(TaskSchema);

export type ExtractedTask = z.infer<typeof TaskSchema>;
