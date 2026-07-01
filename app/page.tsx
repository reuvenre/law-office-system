import { redirect } from "next/navigation";

/**
 * Entry point — send visitors into the app. Middleware bounces unauthenticated
 * users from /dashboard to /login, so this lands you on the right screen.
 */
export default function Home() {
  redirect("/dashboard");
}
