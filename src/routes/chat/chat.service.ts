import { db } from "@/db";
import { Chatlist, SendMessage } from "./chat.input";
import { generateId } from "@/lib/generateId";
import { chat, junk, junkMessage, member, message } from "@/db/schema";
import { media as images } from "@/db/schema";
import { and, eq, inArray, notExists, or, sql } from "drizzle-orm";

export async function getChatlist(userId: string): Promise<Chatlist[]> {
  // Cari semua chat ID di mana userId adalah anggota
  const memberChats = await db.query.member.findMany({
    where: eq(member.userId, userId),
    columns: {
      chatId: true,
    },
  });

  // Ambil semua chat ID yang ditemukan
  const chatIds = memberChats.map((m) => m.chatId);
  // Ambil chat berdasarkan chat ID yang relevan
  const chats = await db.query.chat.findMany({
    where: and(
      inArray(chat.id, chatIds),
      notExists(
        db
          .select()
          .from(junk)
          .where(and(eq(junk.userId, userId), eq(junk.chatId, chat.id))) // Menyaring berdasarkan userId dan chatId
      )
    ),
    with: {
      member: {
        with: {
          user: true,
        },
      },
      message: {
        limit: 1,
        orderBy: (m, { desc }) => [desc(m.createdAt)],
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
        replyTo: {
          with: {
            media: true,
            sender: {
              columns: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });
    return result;
  });
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
    userId: otherMember?.userId,
  };

  return result;
}

export async function getAllmessage({
  id,
  cursor,
  userId, // Tambahkan parameter userId untuk filter berdasarkan junk
}: {
  id: string;
  cursor?: string;
  userId: string; // userId untuk mencari waktu junk terkait
}) {
  const pageSize = 10;

  // Ambil waktu dari junk jika ada
  const junkEntry = await db.query.junkMessage.findFirst({
    where: (junk, { eq, and }) =>
      and(eq(junk.chatId, id), eq(junk.userId, userId)),
    columns: {
      createdAt: true, // Ambil waktu createdAt dari junk
    },
  });

  // Jika ada entri di junk, gunakan createdAt sebagai batas
  const junkCreatedAt = junkEntry?.createdAt || null;

  // Query untuk mengambil pesan, filter berdasarkan junkCreatedAt
  const messages = await db.query.message.findMany({
    where: (m, { eq, and, gt }) =>
      and(
        eq(m.chatId, id),
        cursor ? sql`${m.createdAt} < ${cursor}` : undefined,
        junkCreatedAt ? gt(m.createdAt, junkCreatedAt) : undefined
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
      replyTo: {
        with: {
          media: true,
          sender: {
            columns: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  });

  // Tentukan cursor untuk paging
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
  const [chat] = await db
    .insert(junk)
    .values({
      chatId,
      userId,
    })
    .returning();

  await db.insert(junkMessage).values({ chatId, userId });
  return chat.chatId;
}

export async function removeMessage(params: {
  userId: string;
  chatId: string;
  messageId: string;
}) {
  const [result] = await db
    .delete(message)
    .where(
      and(
        eq(message.senderId, params.userId),
        eq(message.id, params.messageId),
        eq(message.chatId, params.chatId)
      )
    )
    .returning();
  return result.id;
}
