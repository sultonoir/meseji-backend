import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const createDenoInput = z.object({
  name: z.string({ required_error: "Please enter valid name" }).min(6, {
    message: "name must have 6 characker",
  }),
});

export const validInput = zValidator("json", createDenoInput, (result, c) => {
  if (!result.success) {
    const err = result.error.flatten();
    return c.json({
      name: err.fieldErrors.name?.[0],
    });
  }
});
