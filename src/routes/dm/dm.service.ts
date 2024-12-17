import { db } from "@/db";
import { generateId } from "@/lib/generateId";
import { Chatlist } from "../chat/chat.input";
import { chat, junk, junkMessage, member, message } from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

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
    const existingChat = await db.query.chat.findFirst({
      where: (table, { inArray, and, eq }) =>
        and(
          eq(table.isGroup, false), // Pastikan bukan grup
          inArray(
            table.id,
            db
              .select({ chatId: member.chatId }) // Subquery memilih chatId
              .from(member)
              .where(or(eq(member.userId, userId), eq(member.userId, other)))
              .groupBy(member.chatId) // Kelompokkan berdasarkan chatId
              .having(
                sql`COUNT(DISTINCT ${member.userId}) = 2` // Validasi jumlah anggota = 2
              )
          )
        ),
      with: {
        member: {
          with: {
            user: true,
          },
        }, // Ambil relasi member untuk validasi
        message: true,
      },
    });

    if (existingChat) {
      // restore
      await restoreChatFromJunk(userId, existingChat.id, other);
      // Jika chat sudah ada, kembalikan chat yang sudah ada
      const [mess] = await tx
        .insert(message)
        .values({ senderId: userId, content, chatId: existingChat.id })
        .returning();
      const otherMember = existingChat.member.find(
        (item) => item.userId !== userId
      );

      return {
        id: existingChat.id,
        name: otherMember?.user.name ?? "",
        image: otherMember?.user.image ?? "",
        unreadCount: otherMember?.unreadCount ?? 0,
        lastMessage: mess.content ?? "",
        lastSent: mess.createdAt,
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
      unreadCount: 0,
      lastMessage: content,
      lastSent: new Date(),
      isGroup: false,
    };
  });
  return personal;
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

  await db.insert(junkMessage).values({ chatId, userId });
  return chat.chatId;
}
