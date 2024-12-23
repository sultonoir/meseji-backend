import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const updateUserschema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  baner: z.string().optional(),
  status: z.string().optional(),
});

export const UpdateUserValidation = zValidator(
  "json",
  updateUserschema,
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

export type UserUpdateInput = {
  name?: string;
  image?: string;
  baner?: string;
  status?: string;
  userId: string;
};
