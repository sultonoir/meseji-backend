import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const SigninSchema = z.object({
  email: z.string().email({ message: "Please enter valid email address" }),
  password: z.string().min(1, {
    message: "password must have 6 character",
  }),
});

export const singinInput = zValidator("json", SigninSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        message: "Validation error",
      },
      422
    );
  }
});

const SignupSchema = z.object({
  name: z.string().min(4, {
    message: "name min must have 4 character",
  }),
  email: z.string().email({ message: "Please enter valid email address" }),
  password: z.string().min(1, {
    message: "password must have 6 character",
  }),
  username: z.string().min(4, {
    message: "name min must have 4 character",
  }),
});

export const signupInput = zValidator("json", SignupSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        message: "Validation error",
      },
      422
    );
  }
});
