/**
 * The app's public base URL — the origin that client-facing links (portal
 * magic links, payment success redirects, the Cardcom webhook) must be built
 * from.
 *
 * `APP_URL` wins so a deployment can point public links at a custom domain
 * independently of the Auth.js callback host; `NEXTAUTH_URL` is the fallback.
 *
 * In production the localhost fallback is a trap rather than a convenience: it
 * fails silently, and the first sign of trouble is a client receiving a magic
 * link to http://localhost:3000. So there we throw instead — a loud failure on
 * the one request that needed it beats a broken link in a client's inbox.
 */
export function appBaseUrl(): string {
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_URL is not set. Client-facing links (portal access, payment " +
        "redirects, webhooks) are built from it, so it must be the address " +
        "clients actually reach — e.g. https://law.office.win-solutions.co.il"
    );
  }
  return "http://localhost:3000";
}
