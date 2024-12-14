import {
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
  pgTable,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { generateId } from "@/lib/generateId";

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 36 })
      .notNull()
      .default(generateId(10)),
    image: varchar("image", { length: 255 }).notNull().default(""),
    hashedPassword: varchar("hashed_password", { length: 255 }),
    bio: text("bio").notNull().default(""),
    baner: varchar("baner", { length: 255 }).notNull().default(""),
    status: varchar("status", { length: 255 }),
    lastSeen: timestamp("last_seen").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (users) => ({
    emailIndex: uniqueIndex("users_email_idx").on(users.email),
    usernameIndex: uniqueIndex("users_username_idx").on(users.username),
    lastSeenIndex: index("users_last_seen_idx").on(users.lastSeen),
  })
);

export const chats = pgTable(
  "chats",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    name: varchar("name", { length: 255 }).notNull().default(""),
    image: varchar("image", { length: 255 }).notNull().default(""),
    desc: text("desc").notNull().default(""),
    invitedCode: varchar("invited_code", { length: 36 })
      .notNull()
      .default(generateId(10)),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    isGroup: boolean("is_group").notNull().default(false),
  },
  (chats) => ({
    invitedCodeIndex: uniqueIndex("chats_invited_code_idx").on(
      chats.invitedCode
    ),
    isGroupIndex: index("chats_is_group_idx").on(chats.isGroup),
  })
);

export const members = pgTable(
  "members",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    chatId: varchar("chat_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }),
    role: varchar("role", { length: 255 }).notNull().default(""),
    unreadCount: integer("unread_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (members) => ({
    chatIdIndex: index("members_chat_id_idx").on(members.chatId),
    userIdIndex: index("members_user_id_idx").on(members.userId),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    content: text("content"),
    senderId: varchar("sender_id", { length: 36 }).notNull(),
    chatId: varchar("chat_id", { length: 36 }).notNull(),
    replyToId: varchar("reply_to_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (messages) => ({
    senderIdIndex: index("messages_sender_id_idx").on(messages.senderId),
    chatIdIndex: index("messages_chat_id_idx").on(messages.chatId),
  })
);

export const messageReads = pgTable(
  "message_reads",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    chatId: varchar("chat_id", { length: 36 }).notNull(),
    messageId: varchar("message_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (messageReads) => ({
    uniqueReadIndex: uniqueIndex("message_reads_unique_idx").on(
      messageReads.userId,
      messageReads.messageId,
      messageReads.chatId
    ),
  })
);

export const media = pgTable(
  "media",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    value: text("value").notNull(),
    caption: text("caption").notNull().default(""),
    messageId: varchar("message_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (media) => ({
    messageIdIndex: index("media_message_id_idx").on(media.messageId),
  })
);

export const junk = pgTable(
  "junk",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(generateId(10)),
    userId: varchar("user_id", { length: 36 }).notNull(),
    chatId: varchar("chat_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (junk) => ({
    userIdIndex: index("junk_user_id_idx").on(junk.userId),
    chatIdIndex: index("junk_chat_id_idx").on(junk.chatId),
  })
);

// Define foreign keys and relationships
relations(users, ({ many }) => ({
  senderMessages: many(messages),
  junk: many(junk),
}));

relations(chats, ({ many }) => ({
  members: many(members),
  messages: many(messages),
  junk: many(junk),
}));

relations(members, ({ one }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
  chat: one(chats, { fields: [members.chatId], references: [chats.id] }),
}));

relations(messages, ({ one, many }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
  replies: many(messages),
  media: many(media),
}));

relations(media, ({ one }) => ({
  message: one(messages, {
    fields: [media.messageId],
    references: [messages.id],
  }),
}));

relations(junk, ({ one }) => ({
  user: one(users, { fields: [junk.userId], references: [users.id] }),
  chat: one(chats, { fields: [junk.chatId], references: [chats.id] }),
}));
