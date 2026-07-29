import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/shared";

function generateTicketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "MP-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const message = formData.get("message") as string | null;
  const category = formData.get("category") as string | null;
  const attachment = formData.get("attachment") as File | null;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const ticketId = generateTicketId();
  const userEmail = user.email || "unknown";
  const userName = user.user_metadata?.display_name || user.user_metadata?.name || "User";

  // Build attachment info
  let attachmentInfo = "";
  let attachmentBase64 = "";
  if (attachment && attachment.size > 0) {
    if (attachment.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Attachment too large (max 5 MB)" }, { status: 400 });
    }
    const buffer = Buffer.from(await attachment.arrayBuffer());
    attachmentBase64 = buffer.toString("base64");
    attachmentInfo = `\n\nAttachment: ${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`;
  }

  // Email to support (hidden address)
  const supportHtml = `
    <div style="font-family: Georgia, serif; color: #2C2C2A; max-width: 600px;">
      <h2 style="color: #D4AF37; font-size: 18px;">Support Ticket ${ticketId}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px; font-weight: 600; color: #8B7355;">From</td><td style="padding: 6px 12px;">${userName} &lt;${userEmail}&gt;</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: 600; color: #8B7355;">User ID</td><td style="padding: 6px 12px; font-size: 12px;">${user.id}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: 600; color: #8B7355;">Category</td><td style="padding: 6px 12px;">${category || "General"}</td></tr>
      </table>
      <div style="background: #FAF9F5; border-left: 3px solid #D4AF37; padding: 16px; margin: 16px 0; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      ${attachmentInfo ? `<p style="color: #8B7355; font-size: 13px;">${attachmentInfo.trim()}</p>` : ""}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">Reply directly to this email to respond to the user.</p>
    </div>
  `;

  // Build Resend payload with attachment if present
  const supportPayload: Record<string, unknown> = {
    from: (process.env.RESEND_FROM_EMAIL || "The Memory Palace <onboarding@resend.dev>").replace(/[\r\n]/g, "").replace("\\n", "").trim(),
    to: ["bram@elyphont.com"],
    subject: `[${ticketId}] Support: ${category || "General"} — ${userName}`,
    html: supportHtml,
    text: `Ticket ${ticketId}\nFrom: ${userName} <${userEmail}>\nCategory: ${category || "General"}\n\n${message}${attachmentInfo}`,
    reply_to: userEmail,
    tags: [{ name: "category", value: "support" }],
  };

  if (attachmentBase64 && attachment) {
    supportPayload.attachments = [{
      filename: attachment.name,
      content: attachmentBase64,
    }];
  }

  // Send to support. If delivery to the team fails (or there is no API key),
  // do NOT send the user a false confirmation — surface an error so the ticket
  // can be retried instead of being silently lost.
  if (!process.env.RESEND_API_KEY) {
    console.error("[help/contact] RESEND_API_KEY missing — support ticket not delivered", ticketId);
    return NextResponse.json({ error: "Support delivery is temporarily unavailable. Please try again later." }, { status: 502 });
  }

  try {
    const supportRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(process.env.RESEND_API_KEY || "").replace(/[\r\n]/g, "").replace("\\n", "").trim()}`,
      },
      body: JSON.stringify(supportPayload),
    });
    if (!supportRes.ok) {
      const detail = await supportRes.text().catch(() => "");
      console.error("[help/contact] support email failed", ticketId, supportRes.status, detail);
      return NextResponse.json({ error: "We couldn't submit your message. Please try again in a moment." }, { status: 502 });
    }
  } catch (err) {
    console.error("[help/contact] support email threw", ticketId, err);
    return NextResponse.json({ error: "We couldn't submit your message. Please try again in a moment." }, { status: 502 });
  }

  // Confirmation to user
  const confirmHtml = `
    <div style="font-family: Georgia, serif; color: #2C2C2A; max-width: 600px; padding: 24px;">
      <h2 style="color: #D4AF37; font-size: 20px; margin-bottom: 8px;">We received your message</h2>
      <p style="font-size: 15px; line-height: 1.6;">Hi ${userName},</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for reaching out. Your ticket number is:</p>
      <p style="font-size: 24px; font-weight: 700; color: #D4AF37; text-align: center; padding: 16px; background: #FAF9F5; border-radius: 8px; letter-spacing: 2px;">${ticketId}</p>
      <p style="font-size: 15px; line-height: 1.6;">We'll get back to you as soon as possible. Please keep this ticket number for your reference.</p>
      <p style="font-size: 13px; color: #8B7355; margin-top: 24px;">The Memory Palace Team</p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Your support ticket ${ticketId} — The Memory Palace`,
    html: confirmHtml,
    tag: "support-confirmation",
  });

  return NextResponse.json({ ok: true, ticketId });
}
