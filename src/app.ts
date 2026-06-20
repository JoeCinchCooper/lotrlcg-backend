import { Hono } from "hono";
import health from "./routes/health";
import media from "./routes/media";
import posts from "./routes/posts";
import users from "./routes/users";

const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

app.route("/", health);
app.route("/", posts);
app.route("/", users);
app.route("/", media);

export default app;
