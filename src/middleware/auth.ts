import { MiddlewareHandler } from "hono";

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || !token || token !== secret) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
};
