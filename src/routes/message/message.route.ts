import { db } from "@/db";
import { Env } from "@/types";
import { Hono } from "hono";

export const all = new Hono<Env>().basePath("/all");

all.get("/", async (c) => {
  const getAllmessage = await db.message.findMany();

  return c.json({ all: getAllmessage });
});
