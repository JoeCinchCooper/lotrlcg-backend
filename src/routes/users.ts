import { Hono } from "hono";
import { listAuthorPosts } from "../dal/posts";

const users = new Hono();

// GET /users/:id/posts — author's posts
users.get("/users/:id/posts", async (c) => {
  const cursor = c.req.query("cursor");
  const page = await listAuthorPosts(c.req.param("id"), cursor);
  return c.json(page);
});

export default users;
