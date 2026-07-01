"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { requireLawyer } from "@/lib/auth/guards";
import { logActivity } from "@/lib/activity";
import { clientSchema } from "@/lib/validations/client";
import { checkNameConflicts } from "@/lib/data/clients";

export type ClientFormState = {
  errors?: Record<string, string[]>;
  error?: string;
} | undefined;

function parseForm(formData: FormData) {
  return clientSchema.safeParse({
    fullName: formData.get("fullName"),
    idNumber: formData.get("idNumber") ?? "",
    clientType: formData.get("clientType"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
    reminderConsent: formData.get("reminderConsent") === "on",
    reminderChannel: formData.get("reminderChannel"),
  });
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const user = await requireLawyer();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let newId: string;
  try {
    const [row] = await db
      .insert(clients)
      .values({ ...parsed.data, createdBy: user.id })
      .returning({ id: clients.id });
    newId = row.id;
    await logActivity({
      actorId: user.id,
      entityType: "client",
      entityId: newId,
      action: "create",
      metadata: { fullName: parsed.data.fullName },
    });
  } catch {
    return { error: "שמירת הלקוח נכשלה" };
  }

  revalidatePath("/clients");
  redirect(`/clients/${newId}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const user = await requireLawyer();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.update(clients).set(parsed.data).where(eq(clients.id, clientId));
    await logActivity({
      actorId: user.id,
      entityType: "client",
      entityId: clientId,
      action: "update",
    });
  } catch {
    return { error: "עדכון הלקוח נכשל" };
  }

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function checkConflictsAction(name: string) {
  await requireLawyer();
  if (!name || name.trim().length < 2) {
    return { clientMatches: [], opposingMatches: [] };
  }
  return checkNameConflicts(name);
}

export async function deleteClientAction(clientId: string) {
  const user = await requireLawyer();
  await db.delete(clients).where(eq(clients.id, clientId));
  await logActivity({
    actorId: user.id,
    entityType: "client",
    entityId: clientId,
    action: "delete",
  });
  revalidatePath("/clients");
  redirect("/clients");
}
