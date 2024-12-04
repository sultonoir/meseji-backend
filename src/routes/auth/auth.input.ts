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
    const err = result.error.flatten();
    return c.json({
      success: false,
      message: {
        email: err.fieldErrors.email?.[0],
        password: err.fieldErrors.password?.[0],
      },
    });
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
    const err = result.error.flatten();
    return c.json(
      {
        success: false,
        message: {
          email: err.fieldErrors.email?.[0],
          password: err.fieldErrors.password?.[0],
          name: err.fieldErrors.name?.[0],
          username: err.fieldErrors.username?.[0],
        },
      },
      400
    );
  }
});
