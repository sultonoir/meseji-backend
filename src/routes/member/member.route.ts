import { Env } from "@/types";
import { Hono } from "hono";
import { addMember, getInviteCode } from "./member.service";
import { validationAddMember } from "./member.input";
import { authMiddleware } from "@/middleware/auth.middleware";

export const member = new Hono<Env>().basePath("/member");

member
  .get("/code/:codeId", async (c) => {
    const code = c.req.param("codeId");
    const result = await getInviteCode({ code });
    return c.json(result);
  })
  .post("/add", validationAddMember, authMiddleware, async (c) => {
    const body = c.req.valid("json");
    const session = c.get("user");

    try {
      const result = await addMember({
        chatId: body.chatId,
        name: session.name,
        userId: session.id,
      });

      return c.json({ chatId: result });
    } catch (error) {
      const err = error as Error;
      return c.json({ message: err.message }, 500);
    }
  });
