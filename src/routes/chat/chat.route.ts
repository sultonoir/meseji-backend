import { Env } from "@/types";
import { Hono } from "hono";
import { CreateChatGroup, CreateDm, QuerySchema } from "./chat.input";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  createChatGroup,
  createChatPersonal,
  getAllmessage,
  getChatByid,
  getChatlist,
  removeChat,
} from "./chat.service";

export const group = new Hono<Env>().basePath("/chat");

group
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

    const messages = await getAllmessage({ id, cursor: cursor });
    return c.json(messages);
  })
  .post("/group", CreateChatGroup, async (c) => {
    const user = c.get("user");
    const { name, image } = c.req.valid("json");
    const group = await createChatGroup({
      userId: user.id,
      username: user.name,
      name,
      image,
    });

    if (!group) {
      return c.json(
        {
          message: "Error create group",
        },
        400
      );
    }

    return c.json(group);
  })
  .post("/dm", CreateDm, async (c) => {
    const { id } = c.get("user");
    const data = c.req.valid("json");
    const chat = await createChatPersonal({
      content: data.content,
      userId: id,
      other: data.other,
    });

    if (!chat) {
      return c.json(
        {
          message: "Error send message",
        },
        500
      );
    }

    return c.json(chat);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const result = await removeChat({ userId: user.id, chatId: id });
    return c.json(result);
  });
