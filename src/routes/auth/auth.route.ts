import { Hono } from "hono";
import { sign } from "hono/jwt";
import { Env } from "@/types";
import { signupInput, singinInput } from "./auth.input";
import { Argon2id } from "oslo/password";
import { db } from "@/db";
import { setSignedCookie } from "hono/cookie";
import { authMiddleware } from "@/middleware/auth.middleware";
import { users } from "@/db/schema";

const argon2id = new Argon2id();
const ONE_WEEK_IN_SECONDS = 7 * 86400; // 7 hari dalam detik
export const auth = new Hono<Env>().basePath("/auth");

auth
  .post("/login", singinInput, async (c) => {
    const { email, password } = c.req.valid("json");

    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });

    if (!existingUser?.hashedPassword) {
      return c.json(
        {
          message: "Invalid email or password",
        },
        400
      );
    }

    const validPassword = await argon2id.verify(
      existingUser.hashedPassword,
      password
    );

    if (!validPassword) {
      return c.json(
        {
          message: "Invalid email or password",
        },
        400
      );
    }

    const payload = {
      id: existingUser.id,
      name: existingUser.name,
      image: existingUser.image,
      username: existingUser.username,
    };
    const secret = process.env.JWT_SECRET as string;
    const token = await sign(payload, secret);

    await setSignedCookie(c, "auth", token, secret, {
      path: "/",
      secure: true,
      httpOnly: true,
      maxAge: ONE_WEEK_IN_SECONDS, // maxAge dalam detik
      sameSite: "lax",
    });

    return c.text("ok");
  })
  .post("/signup", signupInput, async (c) => {
    const { email, password, name, username } = c.req.valid("json");

    const existingUser = await db.query.users.findFirst({
      where: (u, { or, eq }) =>
        or(eq(u.email, email), eq(u.username, username)),
    });

    if (existingUser) {
      return c.json(
        { success: false, message: "Email or username already used" },
        400
      );
    }

    const hashedPassword = await argon2id.hash(password);

    const user = await db
      .insert(users)
      .values({ name, email, username, hashedPassword })
      .returning();

    const payload = {
      id: user.at(0)?.id,
      name: user.at(0)?.name,
      image: user.at(0)?.image,
      username: user.at(0)?.username,
    };

    const secret = process.env.JWT_SECRET as string;
    const token = await sign(payload, secret);

    await setSignedCookie(c, "auth", token, secret, {
      path: "/",
      secure: true,
      httpOnly: true,
      maxAge: ONE_WEEK_IN_SECONDS, // maxAge dalam detik
      sameSite: "lax",
    });

    return c.text("ok");
  })
  .get("/session", authMiddleware, async (c) => {
    const user = c.get("user");

    return c.json(user);
  });
