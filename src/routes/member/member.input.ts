import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const addMemberSchma = z.object({
  chatId: z.string(),
});

export const validationAddMember = zValidator(
  "json",
  addMemberSchma,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Validation error",
        },
        422
      );
    }
  }
);
