import { z } from "zod";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const UploadUrlRequestSchema = z.object({
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  filename: z.string().min(1).max(200),
});

export type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;

export function extensionFor(contentType: string): string {
  return EXTENSION_MAP[contentType] ?? "bin";
}
