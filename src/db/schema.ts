import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  integer,
  primaryKey,
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
  junk: many(junk),
  junkMessage: many(junkMessage),
  contact: many(contact, { relationName: "owner" }),
  friend: many(contact, { relationName: "friend" }),
}));

export const contact = pgTable(
  "contact",
  {
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    friendId: varchar("friend_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Index untuk mempercepat pencarian
    ownerIndex: index("idx_owner_id").on(table.ownerId),
    friendIndex: index("idx_friend_id").on(table.friendId),
    // Unique constraint untuk mencegah duplikasi follow
    uniqueFollow: uniqueIndex().on(table.ownerId, table.friendId),
  })
);

export const contactRelations = relations(contact, ({ one }) => ({
  owner: one(user, {
    fields: [contact.ownerId],
    references: [user.id],
    relationName: "owner",
  }),
  friend: one(user, {
    fields: [contact.friendId],
    references: [user.id],
    relationName: "friend",
  }),
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
  junk: many(junk),
  junkMessage: many(junkMessage),
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
    haveAccess: boolean("have_access").default(false),
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
}));

export const junkMessage = pgTable(
  "junkMessage",
  {
    userId: varchar("user_id", { length: 36 })
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    chatId: varchar("chat_id", { length: 36 })
      .references(() => chat.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.chatId] }),
  })
);

export const junkMessageRealtion = relations(junkMessage, ({ one }) => ({
  user: one(user, { fields: [junkMessage.userId], references: [user.id] }),
  chat: one(chat, { fields: [junkMessage.chatId], references: [chat.id] }),
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
