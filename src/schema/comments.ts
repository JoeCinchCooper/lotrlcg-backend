import { z } from "zod";

export const CreateCommentSchema = z.object({
  authorName: z.string().min(1).max(100),
  body: z.string().min(1).max(10000),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
