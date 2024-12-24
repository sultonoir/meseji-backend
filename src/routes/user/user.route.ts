import { db } from "@/db";
import { authMiddleware } from "@/middleware/auth.middleware";
import { Env } from "@/types";
import { Hono } from "hono";
import { UpdateUserValidation } from "./user.input";
import { sign } from "hono/jwt";
import { setSignedCookie } from "hono/cookie";
import { getUserWithContact, updateUser } from "./user.service";

export const user = new Hono<Env>().basePath("/user");

user
  .use(authMiddleware)
  .get("/:id", async (c) => {
    const session = c.get("user");
    const id = c.req.param("id");

    const user = await getUserWithContact({
      userId: session.id,
      targetUserId: id,
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(user);
  })
  .patch("/", UpdateUserValidation, async (c) => {
    const session = c.get("user");
    const data = c.req.valid("json");
    const result = await updateUser({ userId: session.id, ...data });

    const payload = {
      id: result.id,
      name: result.name,
      image: result.image,
      username: result.username,
    };

    const secret = process.env.JWT_SECRET as string;
    const token = await sign(payload, secret);

    await setSignedCookie(c, "auth", token, secret, {
      path: "/",
      secure: true,
      httpOnly: true,
      maxAge: 7 * 86400, // maxAge dalam detik
      sameSite: "lax",
    });
    const { hashedPassword, ...userWithoutPassword } = result;
    return c.json(userWithoutPassword);
  });
