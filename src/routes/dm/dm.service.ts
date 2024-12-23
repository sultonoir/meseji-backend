import { db } from "@/db";
import { generateId } from "@/lib/generateId";
import { DmInput } from "./dm.input";
import { sendMessage } from "../chat/chat.service";

// Helper function for checking if the chat already exists
async function findExistingChat(userId: string, other: string) {
  const memberId = [userId, other];
  return await db.chat.findFirst({
    where: {
      isGroup: false,
      member: {
        every: {
          userId: { in: memberId },
        },
      },
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
}

// Function to create a new chat
async function createNewChat(
  userId: string,
  other: string,
  content: string,
  chatId: string
) {
  await db.chat.create({
    data: { isGroup: false, id: chatId },
  });
  await db.member.createMany({
    data: [
      { chatId, userId },
      { chatId, userId: other },
    ],
  });

  return await sendMessage({
    chatId,
    senderId: userId,
    content,
    media: [],
  });
}

export async function createChatPersonal({ other, userId, content }: DmInput) {
  const chatId = generateId(10);
  const existingChat = await findExistingChat(userId, other);

  // Case when the chat already exists
  if (!existingChat) {
    const message = await createNewChat(userId, other, content, chatId);

    const newChat = await db.chat.findFirst({
      where: {
        id: chatId,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        message: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const chatlist = {
      senderId: userId,
      chatId,
      member: newChat?.member.map((item) => ({
        id: item.user.id,
        name: item.name ?? item.user.name,
        image: item.user.image,
      })),
    };

    return { chatlist, message };
  }

  await restoreChatFromJunk(userId, existingChat.id, other);

  // Send the message in the existing chat
  const message = await sendMessage({
    chatId: existingChat.id,
    senderId: userId,
    content,
    media: [],
  });

  const chatlist = {
    senderId: userId,
    chatId: existingChat.id,
    member: existingChat.member.map((item) => ({
      id: item.user.id,
      name: item.name ?? item.user.name,
      image: item.user.image,
    })),
  };

  return { chatlist, message };
  // Case when the chat does not exist, create a new one
}

async function restoreChatFromJunk(
  userId: string,
  chatId: string,
  otherId: string
): Promise<void> {
  // Cek apakah chat ada di junk untuk user ini
  const junkEntry = await db.junk.findFirst({
    where: {
      chatId,
      OR: [{ userId }, { userId: otherId }],
    },
  });

  // Jika chat ada di junk, maka pindahkan kembali ke tabel chat
  if (junkEntry) {
    // Hapus chat dari junk
    await db.junk.delete({
      where: {
        id: junkEntry.id,
      },
    });
  }
}

export async function removeChat({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const junk = await db.junk.findFirst({
    where: {
      chatId,
      userId,
    },
  });

  if (!junk) {
    await db.junk.create({
      data: {
        chatId,
        userId,
      },
    });
  }

  await db.junkMessage.upsert({
    where: {
      userId_chatId: {
        userId,
        chatId,
      },
    },
    create: {
      chatId,
      userId,
    },
    update: {
      createdAt: new Date(),
    },
  });

  return chatId;
}
