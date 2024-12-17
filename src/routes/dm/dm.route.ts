import { Env } from "@/types";
import { Hono } from "hono";
import { validationCreateDm } from "./dm.input";
import { createChatPersonal, removeChat } from "./dm.service";

export const dm = new Hono<Env>().basePath("/dm");

dm.post("/", validationCreateDm, async (c) => {
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
}).delete("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const result = await removeChat({ userId: user.id, chatId: id });
  return c.json({ chatId: result });
});
