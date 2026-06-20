import { z } from "zod";

export const CreatePostSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  status: z.enum(["draft", "published"]),
  tags: z.array(z.string()).default([]),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
