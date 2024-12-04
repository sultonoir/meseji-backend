import { Env, Session } from "@/types";
import { createMiddleware } from "hono/factory";
import { getSignedCookie } from "hono/cookie";
import { verify } from "hono/jwt";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const secret = process.env.JWT_SECRET as string;
  const token = await getSignedCookie(c, secret, "auth");

  if (!token) {
    return c.json(
      {
        message: "Unauthorized cookie",
      },
      401
    );
  }

  const session = await verify(token, secret);

  if (!session) {
    return c.json(
      {
        message: "Unauthorized jwt",
      },
      401
    );
  }
  const user = session as Session;
  c.set("user", user);

  await next();
});
