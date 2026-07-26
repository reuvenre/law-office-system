/**
 * The app's public base URL — the origin that client-facing links (portal
 * magic links, payment success redirects) must be built from.
 *
 * `APP_URL` wins so a deployment can point public links at a custom domain
 * independently of the Auth.js callback host; `NEXTAUTH_URL` is the fallback.
 */
export function appBaseUrl(): string {
  return (
    process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
  );
}
