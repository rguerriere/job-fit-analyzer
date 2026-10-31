"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { checkApiKey } from "@/lib/anthropicKey";
import { getCurrentUser } from "@/lib/currentUser";

export type SettingsState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string };

export async function saveApiKey(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const key = String(formData.get("apiKey") ?? "").trim();
  if (!key.startsWith("sk-ant-")) {
    return { status: "error", message: "That doesn't look like an Anthropic API key. Keys start with sk-ant-." };
  }

  const check = await checkApiKey(key);
  if (!check.ok) return { status: "error", message: check.message };

  const user = await getCurrentUser();
  await db.update(users).set({ anthropicApiKey: key }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function removeApiKey(): Promise<void> {
  const user = await getCurrentUser();
  await db.update(users).set({ anthropicApiKey: null }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}
