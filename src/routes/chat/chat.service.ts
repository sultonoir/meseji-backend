import { db } from "@/db";
import { Chatlist, CreateChatGroup, SendMessage } from "./chat.input";
import { generateId } from "@/lib/generateId";
import { chat, junk, member, message } from "@/db/schema";
import { media as images } from "@/db/schema";
import { and, eq, not, sql } from "drizzle-orm";

export async function getChatlist(userId: string): Promise<Chatlist[]> {
  const chats = await db.query.chat.findMany({
    with: {
      message: {
        limit: 1,
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      },
      member: {
        where: (m, { eq }) => eq(m.userId, userId),
        with: {
          user: true,
        },
      },
    },
  });

  return chats.map((chat) => {
    const lastMessage = chat.message[0] || null;
    const currentUserMember = chat.member.find((m) => m.userId === userId);
    const otherMember = chat.member.find((m) => m.userId !== userId);

    return {
      id: chat.id,
      name: chat.isGroup
        ? chat.name || "Unknown Group"
        : otherMember?.user.name || "Unknown User",
      image: chat.isGroup ? chat.image || "" : otherMember?.user.image || "",
      lastMessage: lastMessage?.content || "",
      unreadCount: currentUserMember?.unreadCount || 0,
      lastSent: lastMessage?.createdAt || chat.createdAt,
      isGroup: chat.isGroup,
      userId: otherMember?.userId,
    };
  });
}

export async function sendMessage({
  chatId,
  senderId,
  content,
  replyToId,
  media,
}: SendMessage) {
  const messId = generateId(10);
  // Start a transaction
  return await db.transaction(async (tx) => {
    // 1. Buat pesan baru
    const [newMessage] = await tx
      .insert(message)
      .values({
        content,
        senderId,
        chatId,
        replyToId,
        id: messId,
      })
      .returning();

    if (media.length > 0) {
      await tx.insert(images).values(
        media.map((item) => ({
          id: generateId(),
          value: item,
          messageId: messId,
        }))
      );
    }
    // 2. Perbarui unreadCount untuk anggota lain
    await tx
      .update(member)
      .set({
        unreadCount: sql`${member.unreadCount} + 1`,
      })
      .where(and(not(eq(member.userId, senderId)), eq(member.chatId, chatId)));

    // 3. Output send message
    const result = await tx.query.message.findFirst({
      where: (m, { eq }) => eq(m.id, messId), // Gunakan messId
      with: {
        media: true,
        sender: {
          columns: {
            name: true,
            image: true,
          },
        },
        replyTo: true,
      },
    });
    return result;
  });
}

export async function createChatGroup({
  userId,
  name,
  image,
  username,
}: CreateChatGroup): Promise<Chatlist> {
  const [chatGroup] = await db
    .insert(chat)
    .values({
      id: generateId(),
      invitedCode: generateId(),
      name,
      image,
      isGroup: true,
    })
    .returning();

  await db
    .insert(member)
    .values({ chatId: chatGroup.id, userId, name: username });

  return {
    id: chatGroup.id,
    lastMessage: "",
    lastSent: chatGroup.createdAt,
    unreadCount: 0,
    name,
    image,
    isGroup: chatGroup.isGroup,
  };
}

export async function createChatPersonal({
  other,
  userId,
  content,
}: {
  other: string;
  userId: string;
  content: string;
}): Promise<Chatlist> {
  const chatId = generateId(10);
  const personal = await db.transaction(async (tx) => {
    const existingChat = await tx.query.chat.findFirst({
      where: and(
        eq(chat.isGroup, false),
        eq(member.userId, userId),
        eq(member.userId, userId)
      ),
      with: {
        message: {
          with: {
            media: true,
          },
        },
        member: {
          with: {
            user: true,
          },
        },
      },
    });

    if (existingChat) {
      // Jika chat sudah ada, kembalikan chat yang sudah ada
      const otherMember = existingChat.member.find(
        (item) => item.userId !== userId
      );

      return {
        id: existingChat.id,
        name: otherMember?.user.name ?? "",
        image: otherMember?.user.image ?? "",
        unreadCount: otherMember?.unreadCount ?? 0,
        lastMessage: existingChat.message[0]?.content ?? "",
        lastSent: existingChat.message[0]?.createdAt ?? new Date(0),
        isGroup: existingChat.isGroup,
      };
    }

    await tx
      .insert(chat)
      .values({ isGroup: false, id: chatId })
      .returning({ id: chat.id });
    await tx.insert(member).values([
      { chatId, userId },
      { chatId, userId: other, unreadCount: 1 },
    ]);
    await tx.insert(message).values({ senderId: userId, content, chatId });

    const newChat = await tx.query.chat.findFirst({
      where: eq(chat.id, chatId),
      with: {
        member: {
          with: { user: true },
        },
        message: {
          limit: 1,
          orderBy: (o, { desc }) => [desc(o.createdAt)],
        },
      },
    });

    if (!newChat) {
      throw new Error("Failed to create chat.");
    }

    const otherMember = newChat.member.find((m) => m.userId !== userId);

    return {
      id: newChat.id,
      name: otherMember?.user.name ?? "",
      image: otherMember?.user.image ?? "",
      unreadCount: 1,
      lastMessage: content,
      lastSent: new Date(),
      isGroup: false,
    };
  });
  return personal;
}

export async function getChatByid({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const chat = await db.query.chat.findFirst({
    where: (c, { eq }) => eq(c.id, id),
    with: {
      member: {
        with: {
          user: true,
        },
      },
    },
  });

  const otherMember = chat?.member.find((item) => item.userId !== userId);

  const result = {
    ...chat,
    id: chat?.id,
    name: chat?.isGroup
      ? chat.name || "Unknown Group"
      : otherMember?.user.name || "Unknown User",
    image: chat?.isGroup ? chat.image || "" : otherMember?.user.image || "",
    lastOnline: otherMember?.user.lastSeen,
  };

  return result;
}

export async function getAllmessage({
  id,
  cursor,
}: {
  id: string;
  cursor?: string;
}) {
  const pageSize = 10;
  const messages = await db.query.message.findMany({
    where: (_, { eq, and }) =>
      and(
        eq(message.chatId, id),
        cursor ? sql`${message.createdAt} < ${cursor}` : undefined
      ),
    limit: pageSize + 1,
    with: {
      media: true,
      sender: {
        columns: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  });

  const nextCursor =
    messages.length > pageSize ? messages[pageSize].createdAt : null;

  return {
    messages: messages.slice(0, pageSize),
    nextCursor,
  };
}

export async function removeChat({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const chat = await db
    .insert(junk)
    .values({
      chatId,
      userId,
    })
    .returning();

  return chat;
}
