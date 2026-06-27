import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppErrorBoundaryWrapper from "@/components/ui/AppErrorBoundaryWrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip auth check if Supabase isn't configured yet
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <main id="main-content" style={{ width: "100%" }}>
        <AppErrorBoundaryWrapper>{children}</AppErrorBoundaryWrapper>
      </main>
    );
  }

  const supabase = await createClient();

  // Do NOT let a slow/cold-start auth network call withhold the ENTIRE HTML
  // response — on a Vercel cold start that produces a blank white WKWebView
  // with no splash and no veil ("not responsive after launch"). Race the check
  // against a short timeout: if it resolves we behave exactly as before; if it
  // times out we render the app shell and let the client-side auth guard handle
  // any redirect, so the user never sees an indefinite blank screen.
  const userResult = await Promise.race([
    supabase.auth
      .getUser()
      .then((r) => r.data.user ?? null) // null = checked, definitively no user
      .catch(() => null), // network error → treat as no user (login is safe)
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3500)),
  ]);

  // Redirect only when we positively determined there is no user. On "timeout"
  // we proceed and defer to the client guard rather than block on the network.
  if (userResult !== "timeout" && !userResult) {
    redirect("/login");
  }

  return (
    <main id="main-content" style={{ width: "100%" }}>
      <AppErrorBoundaryWrapper>{children}</AppErrorBoundaryWrapper>
    </main>
  );
}
