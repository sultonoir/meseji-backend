import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const dmSchema = z.object({
  userId: z.string(),
  other: z.string(),
  content: z.string(),
});

export type DmInput = z.infer<typeof dmSchema>;

export const validationCreateDm = zValidator("json", dmSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        message: "Validation error",
      },
      422
    );
  }
});
