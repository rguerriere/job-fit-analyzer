import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users, type User } from "../db/schema";

export const LOCAL_USER_ID = "local";

/**
 * Returns the signed-in user. Until logins are added, everyone using the local
 * app is the same "local" user. Every query already filters by user ID, so
 * adding logins later only means changing this function.
 */
export async function getCurrentUser(): Promise<User> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, LOCAL_USER_ID) });
  if (existing) return existing;

  await db.insert(users).values({ id: LOCAL_USER_ID }).onConflictDoNothing();
  const created = await db.query.users.findFirst({ where: eq(users.id, LOCAL_USER_ID) });
  if (!created) throw new Error("Could not create the local user.");
  return created;
}
