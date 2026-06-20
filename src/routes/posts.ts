import { Hono } from "hono";
import sanitizeHtml from "sanitize-html";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";
import { CreateCommentSchema } from "../schema/comments";
import { CreatePostSchema, UpdatePostSchema } from "../schema/posts";
import {
  createPost,
  deletePost,
  getPostBySlug,
  getPostMeta,
  getPostWithComments,
  getPublishedFeed,
  listAuthorPosts,
  updatePost,
} from "../dal/posts";
import { addComment, listComments } from "../dal/comments";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "strong", "em", "a", "h2", "h3", "ul", "ol", "li", "p", "blockquote", "code", "pre", "img"],
  allowedAttributes: {
    a: ["href"],
    img: ["src"],
  },
};

const posts = new Hono();

// GET /posts — published feed
posts.get("/posts", async (c) => {
  const cursor = c.req.query("cursor");
  const tag = c.req.query("tag");
  const slug = c.req.query("slug");

  if (slug) {
    const post = await getPostBySlug(slug);
    if (!post) return c.json({ error: "Not found" }, 404);
    return c.json(post);
  }

  if (tag) {
    const page = await listAuthorPosts(tag, cursor);
    return c.json(page);
  }

  const page = await getPublishedFeed(cursor);
  return c.json(page);
});

// POST /posts — create (auth)
posts.post("/posts", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation error", details: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  const { status, ...rest } = parsed.data;
  const publishedAt = status === "published" ? now : undefined;

  await createPost({
    id,
    ...rest,
    body: sanitizeHtml(rest.body, SANITIZE_OPTIONS),
    status,
    authorId: process.env.AUTHOR_ID ?? "default-author",
    publishedAt,
    createdAt: now,
    updatedAt: now,
    commentCount: 0,
  });

  return c.json({ id }, 201);
});

// GET /posts/:id — post with comments
posts.get("/posts/:id", async (c) => {
  const { post, comments } = await getPostWithComments(c.req.param("id"));
  if (!post) return c.json({ error: "Not found" }, 404);
  return c.json({ ...post, comments });
});

// PUT /posts/:id — update (auth)
posts.put("/posts/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const existing = await getPostMeta(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  const parsed = UpdatePostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation error", details: parsed.error.issues }, 400);
  }

  const updates = { ...parsed.data, updatedAt: new Date().toISOString() };
  if (updates.body) updates.body = sanitizeHtml(updates.body, SANITIZE_OPTIONS);
  if (updates.status === "published" && !existing.publishedAt) {
    (updates as Record<string, unknown>)["publishedAt"] = updates.updatedAt;
  }

  await updatePost(id, updates);
  return c.json({ id });
});

// DELETE /posts/:id — delete (auth)
posts.delete("/posts/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const existing = await getPostMeta(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  await deletePost(id);
  return c.json({ id });
});

// GET /posts/:id/comments
posts.get("/posts/:id/comments", async (c) => {
  const cursor = c.req.query("cursor");
  const page = await listComments(c.req.param("id"), cursor);
  return c.json(page);
});

// POST /posts/:id/comments (auth)
posts.post("/posts/:id/comments", requireAuth, async (c) => {
  const postId = c.req.param("id");
  const existing = await getPostMeta(postId);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation error", details: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  await addComment({
    id,
    postId,
    authorName: parsed.data.authorName,
    body: sanitizeHtml(parsed.data.body, SANITIZE_OPTIONS),
    createdAt: now,
  });

  return c.json({ id }, 201);
});

export default posts;
