import { Hono } from "hono";
import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";
import { UploadUrlRequestSchema, extensionFor } from "../schema/media";

const s3 = new S3Client({});

const media = new Hono();

// POST /media/upload-url — returns presigned PUT URL
media.post("/media/upload-url", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = UploadUrlRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation error", details: parsed.error.issues }, 400);
  }

  const { contentType } = parsed.data;
  const ext = extensionFor(contentType);
  const key = `media/${uuidv4()}.${ext}`;
  const bucket = process.env.BUCKET_NAME ?? "";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return c.json({ uploadUrl, key }, 200);
});

export default media;
