import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/auth/is-admin";
import { listPendingReports, moderateReport } from "@/lib/social/moderation-actions";
import { T } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * Moderation queue (Apple Guideline 1.2). Lets a moderator act on pending UGC reports
 * within 24h: hard-delete the offending content, eject the offender from public
 * surfaces, or dismiss. Gated to ADMIN_EMAILS, server-checked.
 */
export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    redirect("/atrium");
  }

  const reports = await listPendingReports();

  const cell: React.CSSProperties = {
    padding: "0.625rem 0.75rem",
    borderBottom: `1px solid ${T.color.cream}`,
    fontFamily: T.font.body,
    fontSize: "0.8125rem",
    color: T.color.charcoal,
    verticalAlign: "top",
  };
  const btn = (bg: string): React.CSSProperties => ({
    padding: "0.4rem 0.7rem",
    borderRadius: "0.4rem",
    border: "none",
    background: bg,
    color: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    minHeight: "2.25rem",
  });

  return (
    <main style={{ maxWidth: "60rem", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontFamily: T.font.display, fontSize: "1.5rem", color: T.color.charcoal, margin: "0 0 0.5rem" }}>
        Moderation queue
      </h1>
      <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, margin: "0 0 1.5rem" }}>
        {reports.length} pending {reports.length === 1 ? "report" : "reports"}. Act within 24 hours.
      </p>

      {reports.length === 0 ? (
        <p style={{ fontFamily: T.font.body, color: T.color.muted }}>Nothing to review. 🎉</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: T.color.white, borderRadius: "0.75rem", overflow: "hidden", border: `1px solid ${T.color.cream}` }}>
          <thead>
            <tr style={{ background: T.color.linen }}>
              <th style={{ ...cell, fontWeight: 700 }}>Type</th>
              <th style={{ ...cell, fontWeight: 700 }}>Reason</th>
              <th style={{ ...cell, fontWeight: 700 }}>Details</th>
              <th style={{ ...cell, fontWeight: 700 }}>When</th>
              <th style={{ ...cell, fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td style={cell}>
                  <strong>{r.target_type}</strong>
                  <div style={{ fontSize: "0.6875rem", color: T.color.muted, wordBreak: "break-all" }}>{r.target_id}</div>
                </td>
                <td style={cell}>{r.reason}</td>
                <td style={{ ...cell, maxWidth: "16rem" }}>{r.details || "—"}</td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={cell}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <form action={moderateReport}>
                      <input type="hidden" name="op" value="delete" />
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="targetType" value={r.target_type} />
                      <input type="hidden" name="targetId" value={r.target_id} />
                      <button type="submit" style={btn(T.color.error)}>Delete content</button>
                    </form>
                    {r.target_user_id && (
                      <form action={moderateReport}>
                        <input type="hidden" name="op" value="hideOwner" />
                        <input type="hidden" name="reportId" value={r.id} />
                        <input type="hidden" name="targetUserId" value={r.target_user_id} />
                        <button type="submit" style={btn(T.color.walnut)}>Eject user</button>
                      </form>
                    )}
                    <form action={moderateReport}>
                      <input type="hidden" name="op" value="dismiss" />
                      <input type="hidden" name="reportId" value={r.id} />
                      <button type="submit" style={btn(T.color.sage)}>Dismiss</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
