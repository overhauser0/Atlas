import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  content: z.string().default(""),
  status: z
    .enum(["INBOX", "Waiting", "Going", "Wrapper", "Canceled", "Done"])
    .default("INBOX"),
  priority: z.number().min(1).max(5).default(3),
  source: z.enum(["NOTION", "LOCAL"]).default("LOCAL"),
  dueDate: z.string().datetime().nullable().optional(),
  area: z.enum(["Work", "Life"]).default("Work"),
  type: z.enum(["Task", "Note", "Event"]).default("Task"),
  topics: z.array(z.string()).default([]),
  flags: z.array(z.string()).default([]),
});

export type Task = z.infer<typeof TaskSchema>;
