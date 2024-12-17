import { db } from "@/db";
import { member } from "@/db/schema";

export async function addMember({
  chatId,
  name,
  userId,
}: {
  chatId: string;
  userId: string;
  name: string;
}) {
  const result = await db.transaction(async (tx) => {
    const exist = await tx.query.member.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.chatId, chatId), eq(m.userId, userId)),
    });

    if (!exist) {
      const [add] = await db
        .insert(member)
        .values({ chatId, userId, name, role: "member", haveAccess: false })
        .returning();
      return add.chatId;
    }
    return chatId;
  });

  return result;
}
