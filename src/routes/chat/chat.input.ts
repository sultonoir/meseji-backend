import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

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

const removeMessage = z.object({
  messageId: z.string(),
  chatId: z.string(),
});

export const validationRemoveMess = zValidator(
  "json",
  removeMessage,
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

const searchMessageSchmea = z.object({
  q: z.string(),
});

export const validationSearch = zValidator(
  "query",
  searchMessageSchmea,
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
