import { db } from "@/db";
import { Prisma } from "@prisma/client";
import { UserUpdateInput } from "./user.input";

export async function updateUser({
  userId,
  baner,
  image,
  name,
  status,
}: UserUpdateInput) {
  const updateData: Prisma.UserUpdateInput = {};
  if (name) updateData.name = name;
  if (image) updateData.image = image;
  if (baner) updateData.baner = baner;
  if (status) updateData.status = status;

  return db.user.update({
    where: {
      id: userId,
    },
    data: updateData,
  });
}

export async function updateLastSeen({ id }: { id: string }) {
  const existing = await db.user.findFirst({
    where: {
      id,
    },
  });
  if (!existing) {
    return undefined;
  }
  return await db.user.update({
    where: {
      id: existing.id,
    },
    data: {
      lastSeen: new Date(),
    },
  });
}

export async function getUserWithContact({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  const user = await db.user.findFirst({
    where: {
      id: targetUserId,
    }, // Cari user berdasarkan userId
    include: {
      contact: true,
    },
  });

  // Periksa apakah user ada dalam kontak
  const isContact: boolean =
    user?.contact.some((c) => c.friendId === userId) ?? false;
  // Gabungkan data user dengan status isContact
  const result = {
    id: user?.id,
    name: user?.name,
    image: user?.image,
    baner: user?.baner,
    status: user?.status,
    isContact,
  };

  return result;
}
