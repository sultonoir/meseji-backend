import { generateId } from "@/lib/generateId";
import { Chatlist } from "../chat/chat.input";
import { chat, member } from "@/db/schema";
import { db } from "@/db";
import { CreateChatGroup } from "./group.input";
import { and, count, eq } from "drizzle-orm";

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

export async function outGroup(params: { chatId: string; userId: string }) {
  const [result] = await db
    .delete(member)
    .where(
      and(eq(member.userId, params.userId), eq(member.chatId, params.chatId))
    )
    .returning();
  const [groupChat] = await db
    .select({ count: count() })
    .from(chat)
    .where(eq(chat.id, params.chatId));

  if (groupChat.count === 0) {
    await db.delete(chat).where(eq(chat.id, params.chatId));
  }

  return result.chatId;
}

export async function getInviteCode({ code }: { code: string }) {
  return await db.query.chat.findFirst({
    where: (c, { eq }) => eq(c.invitedCode, code),
    with: {
      member: {
        with: {
          user: {
            columns: {
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
