import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip auth check if Supabase isn't configured yet
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/palace");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(165deg, #FAFAF7 0%, #F2EDE7 50%, #D4C5B2 100%)",
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(193,127,89,0.08) 0%, transparent 70%)",
          top: -100,
          right: -100,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,103,65,0.06) 0%, transparent 70%)",
          bottom: -80,
          left: -80,
          pointerEvents: "none",
        }}
      />

      <main
        id="main-content"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "40px 36px",
          background: "rgba(250,250,247,0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: 20,
          border: "1px solid #EEEAE3",
          boxShadow: "0 8px 32px rgba(44,44,42,0.12)",
          position: "relative",
          zIndex: 1,
          margin: "20px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
