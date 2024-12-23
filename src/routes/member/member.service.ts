import { db } from "@/db";

export async function addMember({
  chatId,
  name,
  userId,
}: {
  chatId: string;
  userId: string;
  name: string;
}) {
  await db.member.create({
    data: { chatId, userId, name, role: "member", haveAccess: false },
  });

  return chatId;
}
