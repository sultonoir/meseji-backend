import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const GroupSchema = z.object({
  name: z.string({
    required_error: "Please enter valide name",
  }),
  image: z.string({
    required_error: "Please enter valide image",
  }),
});

export const validationCreateGroup = zValidator(
  "json",
  GroupSchema,
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

export type CreateChatGroup = {
  userId: string;
  name: string;
  image: string;
  username?: string;
};

const outGroupSchme = z.object({
  chatId: z.string(),
});

export const validationOutGroup = zValidator(
  "json",
  outGroupSchme,
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