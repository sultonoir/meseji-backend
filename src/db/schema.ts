import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { generateId } from "@/lib/generateId";

export const user = pgTable("user", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => generateId(10)),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  image: varchar("image", { length: 255 }).notNull().default(""),
  hashedPassword: varchar("hashed_password", { length: 255 }),
  bio: text("bio").notNull().default(""),
  baner: varchar("baner", { length: 255 }).notNull().default(""),
  status: varchar("status", { length: 255 }),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  member: many(member),
  senderMessage: many(message),
  messageReads: many(messageReads),
  junk: many(junk),
}));

export const chat = pgTable("chat", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => generateId(10)),
  name: varchar("name", { length: 255 }).notNull().default(""),
  image: varchar("image", { length: 255 }).notNull().default(""),
  desc: text("desc").notNull().default(""),
  invitedCode: varchar("invited_code", { length: 255 })
    .notNull()
    .$defaultFn(() => generateId(10)),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isGroup: boolean("is_group").notNull().default(false),
});

export const chatRelations = relations(chat, ({ many }) => ({
  member: many(member),
  message: many(message),
  messageReads: many(messageReads),
  junk: many(junk),
}));

export const member = pgTable(
  "member",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => generateId(10)),
    chatId: varchar("chat_id", { length: 36 })
      .references(() => chat.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 36 })
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }),
    role: varchar("role", { length: 255 }).notNull().default(""),
    unreadCount: integer("unread_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    chatIndex: index("member_chat_idx").on(table.chatId),
    userIndex: index("member_user_idx").on(table.userId),
  })
);

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, { fields: [member.userId], references: [user.id] }),
  chat: one(chat, { fields: [member.chatId], references: [chat.id] }),
}));

export const message = pgTable("message", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => generateId(10)),
  content: text("content"),
  senderId: varchar("sender_id", { length: 36 })
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  chatId: varchar("chat_id", { length: 36 })
    .references(() => chat.id, { onDelete: "cascade" })
    .notNull(),
  replyToId: varchar("reply_to_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messageRelations = relations(message, ({ one, many }) => ({
  sender: one(user, { fields: [message.senderId], references: [user.id] }),
  chat: one(chat, { fields: [message.chatId], references: [chat.id] }),
  replyTo: one(message, {
    fields: [message.replyToId],
    references: [message.id],
  }),
  media: many(media),
  messageReads: many(messageReads),
}));

export const junk = pgTable("junk", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => generateId(10)),
  userId: varchar("user_id", { length: 36 })
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  chatId: varchar("chat_id", { length: 36 })
    .references(() => chat.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const junkRelations = relations(junk, ({ one }) => ({
  user: one(user, { fields: [junk.userId], references: [user.id] }),
  chat: one(chat, { fields: [junk.chatId], references: [chat.id] }),
}));

export const messageReads = pgTable(
  "message_reads",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => generateId(10)),
    chatId: varchar("chat_id", { length: 36 }).notNull(),
    messageId: varchar("message_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueRead: uniqueIndex("unique_user_message_chat").on(
      table.userId,
      table.messageId,
      table.chatId
    ),
  })
);

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  user: one(user, { fields: [messageReads.userId], references: [user.id] }),
  chat: one(chat, { fields: [messageReads.chatId], references: [chat.id] }),
  message: one(message, {
    fields: [messageReads.messageId],
    references: [message.id],
  }),
}));

export const media = pgTable(
  "media",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => generateId(10)),
    value: varchar("value", { length: 255 }).notNull(),
    caption: text("caption").default("").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    messageId: varchar("message_id", { length: 36 })
      .references(() => message.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    messageIndex: index("media_message_idx").on(table.messageId),
  })
);

export const mediaRelations = relations(media, ({ one }) => ({
  message: one(message, {
    fields: [media.messageId],
    references: [message.id],
  }),
}));
