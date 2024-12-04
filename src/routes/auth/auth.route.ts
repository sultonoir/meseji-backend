import { Hono } from "hono";
import { sign } from "hono/jwt";
import { Env } from "@/types";
import { signupInput, singinInput } from "./auth.input";
import { Argon2id } from "oslo/password";
import { db } from "@/db";
import { setSignedCookie } from "hono/cookie";
import { generateId } from "@/lib/generateId";
import { authMiddleware } from "@/middleware/auth.middleware";

const argon2id = new Argon2id();
const ONE_WEEK_IN_SECONDS = 7 * 86400; // 7 hari dalam detik
export const auth = new Hono<Env>().basePath("/auth");

auth
  .post("/login", singinInput, async (c) => {
    const { email, password } = c.req.valid("json");

    const existingUser = await db.user.findFirst({
      where: { email },
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

    const existingUser = await db.user.findFirst({
      where: { OR: [{ email }] },
    });

    if (existingUser) {
      return c.json(
        { success: false, message: "Email or username already used" },
        400
      );
    }

    const hashedPassword = await argon2id.hash(password);

    const user = await db.user.create({
      data: {
        id: generateId(10),
        email,
        name,
        hashedPassword,
        username,
      },
    });

    const payload = {
      id: user.id,
      name: user.name,
      image: user.image,
      username: user.username,
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
