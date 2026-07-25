import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude client for the AI-assist features (win-solutions). Fail-closed: the
 * whole AI layer is inert unless ANTHROPIC_API_KEY is configured, mirroring how
 * the reminder/webhook integrations gate on their secrets.
 */
let _client: Anthropic | null = null;

/** The model used for assist features; override with ANTHROPIC_MODEL. */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export function isAIEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

/** Concatenate the text blocks of a Claude response into a single string. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
