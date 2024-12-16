import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function updateUser({ userId }: { userId: string }) {
  return db
    .update(user)
    .set({ lastSeen: new Date() })
    .where(eq(user.id, userId));
}
