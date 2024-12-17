import { Env } from "@/types";
import { Hono } from "hono";
import { QuerySchema, validationRemoveMess } from "./chat.input";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getAllmessage,
  getChatByid,
  getChatlist,
  removeChat,
  removeMessage,
} from "./chat.service";

export const chat = new Hono<Env>().basePath("/chat");

chat
  .use(authMiddleware)
  .get("/", async (c) => {
    const user = c.get("user");
    const chatlist = await getChatlist(user.id);
    return c.json(chatlist);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const chat = await getChatByid({ id, userId: user.id });
    if (!chat) {
      return c.json(
        {
          message: "chat not found",
        },
        404
      );
    }
    return c.json(chat);
  })
  .get("/:id/message", QuerySchema, async (c) => {
    const { cursor } = c.req.valid("query");
    const id = c.req.param("id");
    const session = c.get("user");
    const messages = await getAllmessage({
      id,
      cursor: cursor,
      userId: session.id,
    });
    return c.json(messages);
  })
  .delete("/chatlist/:id", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const result = await removeChat({ userId: user.id, chatId: id });
    return c.json(result);
  })
  .delete("/message", validationRemoveMess, async (c) => {
    const body = c.req.valid("json");
    const session = c.get("user");
    try {
      const result = await removeMessage({
        userId: session.id,
        chatId: body.chatId,
        messageId: body.messageId,
      });
      return c.json(result);
    } catch (error) {
      const err = error as Error;
      return c.json({ message: err.message }, 500);
    }
  });
