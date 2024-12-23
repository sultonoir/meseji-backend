import { db } from "@/db";
import { SignupSchema } from "./auth.input";
import { generateId } from "@/lib/generateId";

export async function findUser({
  email,
  username,
}: {
  email?: string;
  username?: string;
}) {
  return await db.user.findFirst({
    where: {
      OR: [
        {
          email,
        },
        {
          username,
        },
      ],
    },
  });
}

export async function createUser({
  password,
  username,
  email,
  name,
}: SignupSchema) {
  const id = generateId();
  return await db.user.create({
    data: { id, username, email, name, hashedPassword: password },
  });
}
