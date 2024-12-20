import { db } from "@/db";
import { generateId } from "@/lib/generateId";
import { Chatlist } from "../chat/chat.input";
import { chat, junk, junkMessage, member, message } from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { DmInput } from "./dm.input";
import { sendMessage } from "../chat/chat.service";

// Helper function for checking if the chat already exists
async function findExistingChat(userId: string, other: string) {
  return db.query.chat.findFirst({
    where: (table, { inArray, and, eq }) =>
      and(
        eq(table.isGroup, false), // Ensure it is not a group
        inArray(
          table.id,
          db
            .select({ chatId: member.chatId }) // Subquery selecting chatId
            .from(member)
            .where(or(eq(member.userId, userId), eq(member.userId, other)))
            .groupBy(member.chatId) // Group by chatId
            .having(sql`COUNT(DISTINCT ${member.userId}) = 2`) // Ensure only two members
        )
      ),
    with: {
      member: {
        with: {
          user: {
            columns: {
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
  await db.insert(chat).values({ isGroup: false, id: chatId });
  await db.insert(member).values([
    { chatId, userId },
    { chatId, userId: other, unreadCount: 1 },
  ]);

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

    const newChat = await db.query.chat.findFirst({
      where: eq(chat.id, chatId),
      with: {
        member: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        message: {
          limit: 1,
          orderBy: (o, { desc }) => [desc(o.createdAt)],
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
  const junkEntry = await db.query.junk.findFirst({
    where: (junk, { eq, and, or }) =>
      and(
        eq(junk.chatId, chatId),
        or(eq(junk.userId, userId), eq(junk.userId, otherId))
      ),
  });

  // Jika chat ada di junk, maka pindahkan kembali ke tabel chat
  if (junkEntry) {
    // Hapus chat dari junk
    await db
      .delete(junk)
      .where(
        and(
          eq(junk.chatId, chatId),
          or(eq(junk.userId, userId), eq(junk.userId, otherId))
        )
      );
  }
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

  const messRemove = await db.query.junkMessage.findFirst({
    where: and(eq(junkMessage.chatId, chatId), eq(junkMessage.userId, userId)),
  });

  console.log({ messRemove });

  if (!messRemove) {
    const createRemove = await db
      .insert(junkMessage)
      .values({ chatId, userId })
      .returning();
    console.log({ createRemove });
    return chat.chatId;
  }
  const update = await db
    .update(junkMessage)
    .set({ createdAt: new Date() })
    .where(and(eq(junkMessage.chatId, chatId), eq(junkMessage.userId, userId)))
    .returning();

  console.log({ update });

  return chat.chatId;
}
