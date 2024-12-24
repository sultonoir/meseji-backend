import { zValidator } from "@hono/zod-validator";
import { object, z } from "zod";

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

const updateGroupInpu = object({
  name: z.string().optional(),
  image: z.string().optional(),
  desc: z.string().optional(),
});

export type UpdateGroupInput = {
  name?: string | undefined;
  image?: string | undefined;
  desc?: string | undefined;
  id: string;
};

export const validateUpdateGroup = zValidator(
  "json",
  updateGroupInpu,
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
