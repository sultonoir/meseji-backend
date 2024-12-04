import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const createDenoInput = z.object({
  name: z.string(),
});

export const validInput = zValidator("json", createDenoInput);
