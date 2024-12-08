import { db } from "@/db";
import { Chatlist, CreateChatGroup, SendMessage } from "./chat.input";
import { generateId } from "@/lib/generateId";

export async function getChatlist(userId: string): Promise<Chatlist[]> {
  const chats = await db.chat.findMany({
    where: {
      junk: {
        none: {
          userId,
        },
      },
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      members: {
        select: {
          userId: true,
          unreadCount: true,
          user: {
            select: { name: true, image: true },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      },
    },
  });

  return chats.map((chat) => {
    const lastMessage = chat.messages[0] || null;
    const currentUserMember = chat.members.find((m) => m.userId === userId);
    const otherMember = chat.members.find((m) => m.userId !== userId);

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
  // Start a transaction
  return await db.$transaction(async (tx) => {
    // 1. Buat pesan baru
    const newMessage = await tx.message.create({
      data: {
        content,
        senderId,
        chatId,
        replyToId,
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
      return {
        ...newMessage,
        media: newMedia,
      };
    }
    // 2. Perbarui unreadCount untuk anggota lain
    const member = await tx.member.updateMany({
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
    console.log(member);
    return {
      ...newMessage,
      media: [],
    };
  });
}

export async function createChatGroup({
  userId,
  name,
  image,
  username,
}: CreateChatGroup): Promise<Chatlist> {
  const chat = await db.chat.create({
    data: {
      id: generateId(),
      invitedCode: generateId(),
      name,
      image,
      isGroup: true,
      members: {
        create: {
          id: generateId(),
          userId,
          name: username,
          role: "admin",
        },
      },
    },
  });

  return {
    id: chat.id,
    lastMessage: "",
    lastSent: chat.createdAt,
    unreadCount: 0,
    name,
    image,
    isGroup: chat.isGroup,
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
  const personal = await db.$transaction(async (tx) => {
    // Cek apakah chat personal antara userId dan other sudah ada
    const existingChat = await tx.chat.findFirst({
      where: {
        isGroup: false, // Pastikan ini adalah chat personal
        AND: [
          {
            members: {
              some: {
                userId,
              },
            },
          },
          {
            members: {
              some: {
                userId: other,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        isGroup: true,
        members: {
          select: {
            userId: true,
            unreadCount: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        messages: {
          select: {
            content: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (existingChat) {
      // Jika chat sudah ada, kembalikan chat yang sudah ada
      const otherMember = existingChat.members.find(
        (item) => item.userId !== userId
      );

      return {
        id: existingChat.id,
        name: otherMember?.user.name ?? "",
        image: otherMember?.user.image ?? "",
        unreadCount: otherMember?.unreadCount ?? 0,
        lastMessage: existingChat.messages[0]?.content ?? "",
        lastSent: existingChat.messages[0]?.createdAt ?? new Date(0),
        isGroup: existingChat.isGroup,
      };
    }

    // Jika chat belum ada, buat chat personal baru
    const chat = await tx.chat.create({
      data: {
        id: generateId(),
        isGroup: false, // Tandai sebagai chat personal
        members: {
          createMany: {
            data: [
              {
                id: generateId(),
                userId,
                name: "", // Nama bisa kosong untuk personal chat
                role: "sender", // Menandakan peran pengirim
              },
              {
                id: generateId(),
                userId: other,
                name: "", // Nama bisa kosong untuk personal chat
                role: "receiver", // Menandakan peran penerima
                unreadCount: 1,
              },
            ],
          },
        },
        messages: {
          create: {
            id: generateId(),
            senderId: userId,
            content,
          },
        },
      },
      select: {
        id: true,
        isGroup: true,
        members: {
          select: {
            unreadCount: true,
            userId: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        messages: {
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
    });

    const otherMember = chat.members.find((item) => item.userId !== userId);

    return {
      id: chat.id,
      name: otherMember?.user.name ?? "",
      image: otherMember?.user.image ?? "",
      unreadCount: otherMember?.unreadCount ?? 0,
      lastMessage: chat.messages[0]?.content ?? "",
      lastSent: chat.messages[0]?.createdAt ?? new Date(0),
      isGroup: chat.isGroup,
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
  const chat = await db.chat.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      image: true,
      desc: true,
      isGroup: true,
      members: {
        select: {
          id: true,
          name: true,
          userId: true,
          user: {
            select: {
              image: true,
              username: true,
              status: true,
              lastSeen: true,
              baner: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const otherMember = chat?.members.find((item) => item.userId !== userId);

  console.log({ otherMember });
  return {
    ...chat,
    id: chat?.id,
    name: chat?.isGroup
      ? chat.name || "Unknown Group"
      : otherMember?.user.name || "Unknown User",
    image: chat?.isGroup ? chat.image || "" : otherMember?.user.image || "",
    lastOnline: otherMember?.user.lastSeen,
  };
}

export async function getAllmessage({
  id,
  cursor,
}: {
  id: string;
  cursor?: string;
}) {
  const pageSize = 10;
  const messages = await db.message.findMany({
    where: {
      chatId: id,
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

export async function removeChat({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const chat = await db.junk.create({
    data: {
      id: generateId(),
      chatId,
      userId,
    },
  });

  return chat;
}
