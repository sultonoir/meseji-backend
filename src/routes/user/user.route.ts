import { db } from "@/db";
import { authMiddleware } from "@/middleware/auth.middleware";
import { Env } from "@/types";
import { Hono } from "hono";
import { UpdateUserValidation } from "./user.input";
import { sign } from "hono/jwt";
import { setSignedCookie } from "hono/cookie";
import { user as User } from "@/db/schema";
import { eq } from "drizzle-orm";

export const user = new Hono<Env>().basePath("/user");

user
  .use(authMiddleware)
  .get("/:id", async (c) => {
    const id = c.req.param("id");

    const user = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, id),
      columns: {
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
  })
  .patch("/", UpdateUserValidation, async (c) => {
    const session = c.get("user");
    const data = c.req.valid("json");
    const updateData: { name?: string; image?: string; baner?: string } = {};

    if (data.name) updateData.name = data.name;
    if (data.image) updateData.image = data.image;
    if (data.baner) updateData.baner = data.baner;
    const [result] = await db
      .update(User)
      .set(updateData)
      .where(eq(User.id, session.id))
      .returning();

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

    return c.json(result);
  });
