import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function updateUser({ userId }: { userId: string }) {
  return db
    .update(user)
    .set({ lastSeen: new Date() })
    .where(eq(user.id, userId));
}

export async function getUserWithContact({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, targetUserId), // Cari user berdasarkan userId
    columns: {
      id: true,
      name: true,
      status: true,
      username: true,
      baner: true,
      image: true,
    },
    with: {
      contact: {
        where: (c, { or, and, eq }) =>
          or(
            and(eq(c.ownerId, userId), eq(c.friendId, targetUserId)),
            and(eq(c.ownerId, targetUserId), eq(c.friendId, userId))
          ),
        columns: {
          ownerId: true,
          friendId: true,
        },
      },
    },
  });

  if (!user) {
    return undefined;
  }

  // Periksa apakah user ada dalam kontak
  const isContact: boolean = (user?.contact?.length ?? 0) > 0;

  // Gabungkan data user dengan status isContact
  const result = {
    ...user,
    isContact,
  };

  return result;
}
