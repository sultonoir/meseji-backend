import { generateId } from "@/lib/generateId";
import { Chatlist } from "../chat/chat.input";
import { db } from "@/db";
import { CreateChatGroup, UpdateGroupInput } from "./group.input";
import { Prisma } from "@prisma/client";

export async function createChatGroup({
  userId,
  name,
  image,
  username,
}: CreateChatGroup): Promise<Chatlist> {
  const chatGroup = await db.chat.create({
    data: {
      id: generateId(),
      invitedCode: generateId(),
      name,
      image,
      isGroup: true,
      member: {
        create: {
          userId,
          name: username,
          role: "admin",
          haveAccess: true,
        },
      },
    },
  });

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

export async function outGroup(params: { chatId: string; userId: string }) {
  const group = await db.chat.update({
    where: {
      id: params.chatId,
    },
    data: {
      member: {
        deleteMany: {
          userId: params.userId,
        },
      },
    },
    include: {
      member: true,
    },
  });

  if (group.member.length === 0) {
    await db.chat.delete({
      where: {
        id: params.chatId,
      },
    });

    return params.chatId;
  }

  return params.chatId;
}

export async function getInviteCode({ code }: { code: string }) {
  return await db.chat.findFirst({
    where: {
      invitedCode: code,
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
              id: true,
              username: true,
              baner: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export async function updateGroup({ name, desc, image, id }: UpdateGroupInput) {
  const conditon: Prisma.ChatUpdateInput = {};

  if (name) {
    conditon.name = name;
  }

  if (desc) {
    conditon.desc = desc;
  }

  if (image) {
    conditon.image = image;
  }

  return await db.chat.update({
    where: {
      id,
    },
    data: conditon,
  });
}
