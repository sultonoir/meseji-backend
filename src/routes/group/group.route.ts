import { authMiddleware } from "@/middleware/auth.middleware";
import { Env } from "@/types";
import { Hono } from "hono";
import { validationCreateGroup, validationOutGroup } from "./group.input";
import { createChatGroup, getInviteCode, outGroup } from "./group.service";

export const group = new Hono<Env>().basePath("/group");

group
  .use(authMiddleware)
  .post("/", validationCreateGroup, async (c) => {
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
  .get("/code/:id", async (c) => {
    const code = c.req.param("id");
    const result = await getInviteCode({ code });
    return c.json(result);
  })
  .delete("/out", validationOutGroup, async (c) => {
    const { id } = c.get("user");
    const { chatId } = c.req.valid("json");
    const result = await outGroup({ chatId, userId: id });
    return c.json({ chatId: result });
  });