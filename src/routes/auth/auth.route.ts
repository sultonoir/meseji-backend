import { Hono } from "hono";
import { sign } from "hono/jwt";
import { Env } from "@/types";
import { signupInput, singinInput } from "./auth.input";
import { Argon2id } from "oslo/password";
import { db } from "@/db";
import { setSignedCookie } from "hono/cookie";
import { authMiddleware } from "@/middleware/auth.middleware";
import { member, user } from "@/db/schema";

const argon2id = new Argon2id();
const ONE_WEEK_IN_SECONDS = 7 * 86400; // 7 hari dalam detik
export const auth = new Hono<Env>().basePath("/auth");

auth
  .post("/login", singinInput, async (c) => {
    const { email, password } = c.req.valid("json");

    const existingUser = await db.query.user.findFirst({
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

    const existingUser = await db.query.user.findFirst({
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

    const res = await db.transaction(async (tx) => {
      const [createUser] = await db
        .insert(user)
        .values({ name, email, username, hashedPassword })
        .returning();

      await tx.insert(member).values({
        chatId: process.env.GROUP_ID as string,
        userId: createUser.id,
        name : createUser.name,
      });

      return createUser;
    });

    const payload = {
      id: res.id,
      name: res.name,
      image: res.image,
      username: res.username,
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
