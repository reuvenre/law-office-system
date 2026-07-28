import { getFirm } from "@/lib/data/firm";
import { isModuleEnabled } from "@/lib/plans";
import { isAIEnabled } from "@/lib/ai/client";

/**
 * Two independent switches guard the AI layer, and both must be on.
 *
 * `ANTHROPIC_API_KEY` is the deployment's switch. The `ai` module is the
 * *firm's* — using these features sends case titles, parties, dates and recent
 * case notes to Anthropic's API, which for a law office is privileged material
 * leaving the building. A firm that has not agreed to that must not have it
 * enabled because another firm on the same deployment did.
 */
export async function aiAvailableFor(firmId: string): Promise<boolean> {
  if (!isAIEnabled()) return false;
  return isModuleEnabled(await getFirm(firmId), "ai");
}
