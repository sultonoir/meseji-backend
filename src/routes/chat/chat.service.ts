import { db } from "@/db";
import { Chatlist, SendMessage } from "./chat.input";
import { generateId } from "@/lib/generateId";

export async function getChatlist(userId: string): Promise<Chatlist[]> {
  // Cari semua chat ID di mana userId adalah anggota
  const chats = await db.chat.findMany({
    where: {
      member: {
        some: {
          userId,
        },
      },
      junk: {
        none: {
          userId,
        },
      },
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
      message: {
        take: 1,
        include: {
          media: true,
          sender: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return chats.map((chat) => {
    const lastMessage = chat.message.at(0);
    const lastMedia =
      lastMessage && lastMessage?.media?.length > 0 ? "Send images" : "";
    const sender: string | undefined = lastMessage?.sender.name;

    const currentUserMember = chat.member.find((m) => m.userId === userId);
    const otherMember = chat.member.find((m) => m.userId !== userId);

    return {
      id: chat.id,
      name: chat.isGroup
        ? chat.name || "Unknown Group"
        : otherMember?.user.name || "Unknown User",
      image: chat.isGroup ? chat.image || "" : otherMember?.user.image || "",
      lastMessage: sender
        ? `${sender} : ${lastMedia || lastMessage?.content}`
        : "Created group",
      unreadCount: currentUserMember?.unreadCount || 0,
      lastSent: lastMessage?.createdAt ?? new Date(),
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
  return await db.$transaction(async (tx) => {
    const id = generateId();
    // 1. Buat pesan baru
    const newMessage = await tx.message.create({
      data: {
        content,
        senderId,
        chatId,
        replyToId,
        id,
      },
      select: {
        id: true,
        senderId: true,
        chatId: true,
        content: true,
        media: true,
        replyTo: true,
        replyToId: true,
        createdAt: true,
        sender: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    if (media.length > 0) {
      const newMedia = await tx.media.createManyAndReturn({
        data: media.map((item) => ({
          id: generateId(),
          value: item,
          messageId: newMessage.id,
        })),
      });
      await tx.member.updateMany({
        where: {
          chatId,
          userId: { not: senderId },
        },
        data: {
          unreadCount: {
            increment: 1, // Tambahkan unreadCount
          },
        },
      });
      return {
        ...newMessage,
        media: newMedia,
      };
    }
    // 2. Perbarui unreadCount untuk anggota lain
    await tx.member.updateMany({
      where: {
        chatId,
        userId: { not: senderId },
      },
      data: {
        unreadCount: {
          increment: 1, // Tambahkan unreadCount
        },
      },
    });

    return {
      ...newMessage,
      media: [],
    };
  });
}

export async function getChatByid({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const chat = await db.chat.findFirst({
    where: {
      id,
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
              lastSeen: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!chat) {
    return undefined;
  }

  const otherMember = chat.member.find((item) => item.userId !== userId);

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
  const junkEntry = await db.junkMessage.findFirst({
    where: {
      chatId: id,
      userId,
    },
  });

  // Jika ada entri di junk, gunakan createdAt sebagai batas
  const junkCreatedAt = junkEntry?.createdAt;

  // Query untuk mengambil pesan, filter berdasarkan junkCreatedAt
  const messages = await db.message.findMany({
    where: {
      chatId: id,
      createdAt: {
        gte: junkCreatedAt,
      },
    },
    take: pageSize + 1,
    cursor: cursor ? { id: cursor } : undefined,
    select: {
      id: true,
      senderId: true,
      content: true,
      chatId: true,
      media: true,
      replyTo: true,
      replyToId: true,
      createdAt: true,
      sender: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const nextCursor = messages.length > pageSize ? messages[pageSize].id : null;

  return {
    messages: messages.slice(0, pageSize),
    nextCursor,
  };
}

export async function removeMessage(params: {
  userId: string;
  chatId: string;
  messageId: string;
}) {
  const result = await db.message.delete({
    where: {
      id: params.messageId,
      senderId: params.userId,
      chatId: params.chatId,
    },
  });
  return {
    chatId: result.chatId,
    messageId: result.id,
  };
}

export async function getSearchMessage({
  q,
  chatId,
}: {
  q: string;
  chatId: string;
}) {
  const messages = await db.message.findMany({
    where: {
      chatId,
      content: {
        contains: q,
        mode: "insensitive",
      },
    },
    include: {
      media: true,
      sender: {
        select: {
          name: true,
          image: true,
        },
      },
      replyTo: {
        include: {
          media: true,
          sender: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
  return messages;
}
