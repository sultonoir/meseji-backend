import { db } from "@/db";
import { authMiddleware } from "@/middleware/auth.middleware";
import { Env } from "@/types";
import { Hono } from "hono";

export const user = new Hono<Env>().basePath("/user");

user.use(authMiddleware).get("/:id", async (c) => {
  const id = c.req.param("id");

  const user = await db.user.findFirst({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      status: true,
      username: true,
      baner: true,
      image: true,
    },
  });

  if (!user) {
    return c.json({ message: "User not found" }, 404);
  }

  return c.json(user);
});
