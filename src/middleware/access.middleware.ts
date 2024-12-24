import { db } from "@/db";
import { Env } from "@/types";
import { createMiddleware } from "hono/factory";

export const accessMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = c.get("user");
  if (!session) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.id,
    },
  });
  if (!member?.haveAccess) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  return await next();
});
