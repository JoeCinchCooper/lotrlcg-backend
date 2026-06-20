import app from "../app";

// Mock DAL modules
jest.mock("../dal/posts", () => ({
  getPublishedFeed: jest.fn(),
  getPostBySlug: jest.fn(),
  listAuthorPosts: jest.fn(),
  createPost: jest.fn(),
  getPostMeta: jest.fn(),
  getPostWithComments: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
}));

jest.mock("../dal/comments", () => ({
  addComment: jest.fn(),
  listComments: jest.fn(),
}));

jest.mock("uuid", () => ({ v4: () => "test-uuid" }));

import {
  getPublishedFeed,
  createPost,
  getPostMeta,
  getPostWithComments,
  updatePost,
  deletePost,
} from "../dal/posts";
import { addComment, listComments } from "../dal/comments";

const mockGetPublishedFeed = getPublishedFeed as jest.Mock;
const mockCreatePost = createPost as jest.Mock;
const mockGetPostMeta = getPostMeta as jest.Mock;
const mockGetPostWithComments = getPostWithComments as jest.Mock;
const mockUpdatePost = updatePost as jest.Mock;
const mockDeletePost = deletePost as jest.Mock;
const mockAddComment = addComment as jest.Mock;
const mockListComments = listComments as jest.Mock;

const ADMIN_SECRET = "test-secret";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_SECRET = ADMIN_SECRET;
  process.env.AUTHOR_ID = "author-1";
});

const authHeader = { Authorization: `Bearer ${ADMIN_SECRET}` };

const basePost = {
  id: "post-1",
  slug: "hello",
  title: "Hello",
  body: "<p>Hello</p>",
  authorId: "author-1",
  status: "published",
  tags: ["news"],
  publishedAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  commentCount: 0,
};

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string };
    expect(json).toEqual({ status: "ok" });
  });
});

describe("GET /posts", () => {
  it("returns published feed", async () => {
    mockGetPublishedFeed.mockResolvedValue({ items: [basePost], nextCursor: undefined });
    const res = await app.request("/posts");
    expect(res.status).toBe(200);
    const json = await res.json() as { items: unknown[] };
    expect(json.items).toHaveLength(1);
  });
});

describe("POST /posts", () => {
  it("returns 401 without auth token", async () => {
    const res = await app.request("/posts", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await app.request("/posts", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Missing required fields" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("Validation error");
  });

  it("creates a post and returns 201", async () => {
    mockCreatePost.mockResolvedValue(undefined);
    const res = await app.request("/posts", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "hello",
        title: "Hello",
        body: "<p>Hello</p>",
        status: "published",
        tags: ["news"],
      }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "test-uuid" });
  });

  it("strips script tags from body before storing", async () => {
    mockCreatePost.mockResolvedValue(undefined);
    await app.request("/posts", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "xss",
        title: "XSS",
        body: '<script>alert("xss")</script><p>safe</p>',
        status: "draft",
        tags: [],
      }),
    });
    const storedBody = (mockCreatePost.mock.calls[0][0] as { body: string }).body;
    expect(storedBody).not.toContain("<script>");
    expect(storedBody).toContain("<p>safe</p>");
  });
});

describe("GET /posts/:id", () => {
  it("returns 404 for unknown post", async () => {
    mockGetPostWithComments.mockResolvedValue({ post: undefined, comments: [] });
    const res = await app.request("/posts/missing");
    expect(res.status).toBe(404);
  });

  it("returns post with comments", async () => {
    mockGetPostWithComments.mockResolvedValue({ post: basePost, comments: [] });
    const res = await app.request("/posts/post-1");
    expect(res.status).toBe(200);
    const json = await res.json() as { id: string; comments: unknown[] };
    expect(json.id).toBe("post-1");
    expect(json.comments).toEqual([]);
  });
});

describe("PUT /posts/:id", () => {
  it("returns 401 without token", async () => {
    const res = await app.request("/posts/post-1", { method: "PUT" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown post", async () => {
    mockGetPostMeta.mockResolvedValue(undefined);
    const res = await app.request("/posts/missing", {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates and returns 200", async () => {
    mockGetPostMeta.mockResolvedValue(basePost);
    mockUpdatePost.mockResolvedValue(undefined);
    const res = await app.request("/posts/post-1", {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /posts/:id", () => {
  it("returns 401 without token", async () => {
    const res = await app.request("/posts/post-1", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown post", async () => {
    mockGetPostMeta.mockResolvedValue(undefined);
    const res = await app.request("/posts/missing", {
      method: "DELETE",
      headers: authHeader,
    });
    expect(res.status).toBe(404);
  });

  it("deletes and returns 200", async () => {
    mockGetPostMeta.mockResolvedValue(basePost);
    mockDeletePost.mockResolvedValue(undefined);
    const res = await app.request("/posts/post-1", {
      method: "DELETE",
      headers: authHeader,
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /posts/:id/comments", () => {
  it("returns 401 without token", async () => {
    const res = await app.request("/posts/post-1/comments", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("strips script from comment body", async () => {
    mockGetPostMeta.mockResolvedValue(basePost);
    mockAddComment.mockResolvedValue(undefined);
    await app.request("/posts/post-1/comments", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: "Eve",
        body: '<script>evil()</script><p>comment</p>',
      }),
    });
    const storedBody = (mockAddComment.mock.calls[0][0] as { body: string }).body;
    expect(storedBody).not.toContain("<script>");
  });
});

describe("GET /posts/:id/comments", () => {
  it("returns paginated comments", async () => {
    mockListComments.mockResolvedValue({ items: [], nextCursor: undefined });
    const res = await app.request("/posts/post-1/comments");
    expect(res.status).toBe(200);
  });
});
