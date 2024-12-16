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

export const CreateChatGroup = zValidator("json", GroupSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        message: "Validation error",
      },
      422
    );
  }
});

export type Chatlist = {
  id: string;
  name: string;
  image: string;
  lastMessage: string;
  unreadCount: number;
  lastSent: Date;
  isGroup: boolean;
  userId?: string;
};

const SendMessage = z.object({
  senderId: z.string(),
  chatId: z.string(),
  content: z.string().optional(),
  replyToId: z.string().optional(),
  media: z.array(z.string()),
});

export type SendMessage = z.infer<typeof SendMessage>;

export type CreateChatGroup = {
  userId: string;
  name: string;
  image: string;
  username?: string;
};

const dmSchema = z.object({
  userId: z.string(),
  other: z.string(),
  content: z.string(),
});

export const CreateDm = zValidator("json", dmSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        message: "Validation error",
      },
      422
    );
  }
});

const querySchema = z.object({
  cursor: z.string().optional(),
});

export const QuerySchema = zValidator("query", querySchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        message: "Validation error",
      },
      422
    );
  }
});

const chatlistQuery = z.object({
  userId: z.string(),
});

export const validationChatlist = zValidator(
  "query",
  chatlistQuery,
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
