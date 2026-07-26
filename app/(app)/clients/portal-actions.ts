"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import { canAccessClient } from "@/lib/auth/scope";
import { createPortalToken, revokeAllForClient } from "@/lib/portal/tokens";
import { logActivity } from "@/lib/activity";
import { appBaseUrl } from "@/lib/url";

export type PortalLinkState =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error: string };

/**
 * Issue a client-portal magic link. The raw token is returned to the staff
 * member exactly once (it is stored only as a SHA-256 hash) so they can send it
 * to the client; it cannot be retrieved again afterwards.
 */
export async function createPortalLinkAction(
  clientId: string
): Promise<PortalLinkState> {
  const viewer = await getViewer();
  if (!(await canAccessClient(clientId, viewer))) {
    return { ok: false, error: "אין הרשאה ללקוח זה" };
  }

  try {
    const { raw, expiresAt } = await createPortalToken({
      clientId,
      firmId: viewer.firmId,
      createdBy: viewer.id,
    });

    await logActivity({
      actorId: viewer.id,
      entityType: "client",
      entityId: clientId,
      action: "create",
      // Never log the token itself.
      metadata: { kind: "portal_link_issued" },
    });

    revalidatePath(`/clients/${clientId}`);
    return {
      ok: true,
      url: `${appBaseUrl()}/portal/access/${raw}`,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (e) {
    console.error("createPortalLinkAction failed", e);
    return { ok: false, error: "יצירת הקישור נכשלה" };
  }
}

/** Revoke every active portal link for a client. */
export async function revokePortalLinksAction(clientId: string) {
  const viewer = await getViewer();
  if (!(await canAccessClient(clientId, viewer))) return;

  await revokeAllForClient(clientId);
  await logActivity({
    actorId: viewer.id,
    entityType: "client",
    entityId: clientId,
    action: "update",
    metadata: { kind: "portal_links_revoked" },
  });
  revalidatePath(`/clients/${clientId}`);
}
