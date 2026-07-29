"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales } from "@/i18n/config";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { isIOS } from "@/lib/native/platform";

const F = T.font;
// Re-skin the whole /help page to the app canon by remapping the local color
// tokens: cream canvas, ink/muted text, hairline borders, ember interactive.
// Gold stays (ceremonial: the ticket-ID chip). Everything reads through C.*.
const C = {
  ...T.color,
  linen: "#FCFAF5",     // page canvas → cream
  charcoal: "#403B36",  // primary text → ink
  walnut: "#716A5E",    // secondary text → muted
  sandstone: "#E3D6BC", // borders/hairlines
  terracotta: "#B85C38",// interactive/CTA → ember
};

export default function HelpPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation("help");
  const { t: tc } = useTranslation("common");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // iOS is free-tier only (Apple 3.1.1): no plan/upgrade text and no billing
  // support category may appear in the native app. FAQ #2 ("is it free?") uses a
  // neutral no-upsell answer on iOS.
  const isIosApp = isIOS();

  const faqs = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: isIosApp ? t("faq2a_ios") : t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
    { q: t("faq4q"), a: t("faq4a") },
    { q: t("faq5q"), a: t("faq5a") },
    { q: t("faq6q"), a: t("faq6a") },
    { q: t("faq7q"), a: t("faq7a") },
    { q: t("faq8q"), a: t("faq8a") },
    { q: t("faq9q"), a: t("faq9a") },
  ];

  const categories = [
    { value: "general", label: t("catGeneral") },
    { value: "technical", label: t("catTechnical") },
    ...(isIosApp ? [] : [{ value: "billing", label: t("catBilling") }]),
    { value: "feature", label: t("catFeature") },
    { value: "other", label: t("catOther") },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("message", message);
      formData.append("category", category);
      if (attachment) formData.append("attachment", attachment);

      const res = await fetch("/api/help/contact", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        setTicketId(data.ticketId);
        setMessage("");
        setAttachment(null);
      } else {
        setError(data.error || t("contactError"));
      }
    } catch {
      setError(t("contactError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.linen, fontFamily: F.body, color: C.charcoal }}>
      {/* Header */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(1.25rem, 5vw, 3.75rem)", height: "4rem",
        background: "rgba(250,250,247,0.92)", backdropFilter: "blur(0.75rem)",
        borderBottom: `1px solid ${C.sandstone}40`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => router.back()} aria-label={tc("a11yBackToHome")} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "2rem", height: "2rem", borderRadius: "0.5rem",
            border: `1px solid ${C.sandstone}50`, background: "none",
            color: C.walnut, cursor: "pointer",
          }}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
            <PalaceLogo variant="mark" color="dark" size="sm" />
            <span style={{ fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500, color: C.charcoal, letterSpacing: "-0.3px" }}>
              The Memory Palace
            </span>
          </Link>
        </div>
        <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} aria-label={tc("a11ySwitchLanguage")} style={{
          background: "none", border: `1px solid ${C.sandstone}60`, borderRadius: "0.375rem",
          padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: F.body,
          fontWeight: 600, color: C.walnut, cursor: "pointer", letterSpacing: "0.5px",
          textTransform: "uppercase", appearance: "none", WebkitAppearance: "none", paddingRight: "1.25rem",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat", backgroundPosition: "right 0.375rem center",
        }}>
          {locales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </nav>

      <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "2.5rem clamp(1.25rem, 5vw, 3rem) 4rem" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{
            fontFamily: F.display, fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 500, color: C.charcoal, marginBottom: "0.75rem",
            letterSpacing: "-0.5px",
          }}>
            {t("title")}
          </h1>
          <p style={{ fontSize: "1rem", color: C.walnut, lineHeight: 1.6, maxWidth: "28rem", margin: "0 auto" }}>
            {t("subtitle")}
          </p>
        </div>

        {/* FAQs */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{
            fontFamily: F.display, fontSize: "1.375rem", fontWeight: 500,
            color: C.charcoal, marginBottom: "1.25rem",
            paddingBottom: "0.5rem", borderBottom: `1px solid ${C.sandstone}40`,
          }}>
            {t("faqTitle")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                border: `1px solid ${openFaq === i ? C.sandstone : `${C.sandstone}40`}`,
                borderRadius: "0.75rem",
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", padding: "1rem 1.25rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: openFaq === i ? `${C.sandstone}12` : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    fontFamily: F.body, fontSize: "0.9375rem",
                    fontWeight: 600, color: C.charcoal, lineHeight: 1.4,
                    transition: "background 0.2s",
                  }}
                >
                  {faq.q}
                  <span style={{
                    flexShrink: 0, marginLeft: "1rem",
                    transform: openFaq === i ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.2s", fontSize: "0.75rem", color: C.muted,
                  }}>
                    {"\u25BC"}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: "0 1.25rem 1rem",
                    fontSize: "0.875rem", color: C.walnut, lineHeight: 1.7,
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section>
          <h2 style={{
            fontFamily: F.display, fontSize: "1.375rem", fontWeight: 500,
            color: C.charcoal, marginBottom: "0.5rem",
            paddingBottom: "0.5rem", borderBottom: `1px solid ${C.sandstone}40`,
          }}>
            {t("contactTitle")}
          </h2>
          <p style={{ fontSize: "0.875rem", color: C.walnut, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {t("contactDesc")}
          </p>

          {ticketId ? (
            <div style={{
              background: `${C.sage}15`, border: `1px solid ${C.sage}40`,
              borderRadius: "0.75rem", padding: "2rem", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{"\u2713"}</div>
              <p style={{ fontFamily: F.display, fontSize: "1.125rem", fontWeight: 500, color: C.charcoal, marginBottom: "0.5rem" }}>
                {t("contactSuccess")}
              </p>
              <p style={{
                fontSize: "1.5rem", fontWeight: 700, color: C.gold, letterSpacing: "2px",
                background: `${C.sandstone}15`, padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem", display: "inline-block", margin: "0.75rem 0",
              }}>
                {ticketId}
              </p>
              <p style={{ fontSize: "0.8125rem", color: C.walnut, marginTop: "0.5rem" }}>
                {t("contactSuccessDesc")}
              </p>
              <button
                onClick={() => { setTicketId(null); setError(null); }}
                style={{
                  marginTop: "1.25rem", padding: "0.5rem 1.5rem",
                  background: C.terracotta, color: "#FFF", border: "none",
                  borderRadius: "0.5rem", fontFamily: F.body, fontSize: "0.8125rem",
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                {t("contactAnother")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Category */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: C.charcoal, marginBottom: "0.375rem" }}>
                  {t("contactCategory")}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%", padding: "0.625rem 0.875rem",
                    border: `1px solid ${C.sandstone}60`, borderRadius: "0.5rem",
                    background: C.white || "#FFF", fontFamily: F.body, fontSize: "0.875rem",
                    color: C.charcoal, appearance: "none", WebkitAppearance: "none",
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center",
                  }}
                >
                  {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Message */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: C.charcoal, marginBottom: "0.375rem" }}>
                  {t("contactMessage")}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("contactPlaceholder")}
                  rows={5}
                  style={{
                    width: "100%", padding: "0.625rem 0.875rem",
                    border: `1px solid ${C.sandstone}60`, borderRadius: "0.5rem",
                    background: C.white || "#FFF", fontFamily: F.body, fontSize: "0.875rem",
                    color: C.charcoal, resize: "vertical", lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Attachment */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: C.charcoal, marginBottom: "0.375rem" }}>
                  {t("contactAttachment")}
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.txt"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: "0.5rem 1rem", border: `1px dashed ${C.sandstone}80`,
                    borderRadius: "0.5rem", background: "transparent",
                    fontFamily: F.body, fontSize: "0.8125rem", color: C.walnut,
                    cursor: "pointer", transition: "border-color 0.2s",
                  }}
                >
                  {attachment ? attachment.name : t("contactAttachBtn")}
                </button>
                {attachment && (
                  <button
                    onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }}
                    style={{
                      marginLeft: "0.5rem", background: "none", border: "none",
                      color: C.terracotta, fontSize: "0.75rem", cursor: "pointer",
                    }}
                  >
                    {t("contactRemove")}
                  </button>
                )}
              </div>

              {error && (
                <p style={{ fontSize: "0.8125rem", color: C.terracotta }}>{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={sending || !message.trim()}
                style={{
                  padding: "0.75rem 2rem", background: sending ? C.sandstone : C.terracotta,
                  color: "#FFF", border: "none", borderRadius: "0.5rem",
                  fontFamily: F.body, fontSize: "0.9375rem", fontWeight: 600,
                  cursor: sending ? "wait" : "pointer", alignSelf: "flex-start",
                  opacity: !message.trim() ? 0.5 : 1,
                  transition: "background 0.2s, opacity 0.2s",
                }}
              >
                {sending ? t("contactSending") : t("contactSend")}
              </button>
            </div>
          )}
        </section>

        {/* Community link */}
        <section style={{
          marginTop: "3rem", padding: "2rem", textAlign: "center",
          background: `${C.sandstone}12`, borderRadius: "1rem",
          border: `1px solid ${C.sandstone}30`,
        }}>
          <p style={{ fontFamily: F.display, fontSize: "1.125rem", fontWeight: 500, color: C.charcoal, marginBottom: "0.5rem" }}>
            {t("communityTitle")}
          </p>
          <p style={{ fontSize: "0.875rem", color: C.walnut, lineHeight: 1.6, marginBottom: "1rem" }}>
            {t("communityDesc")}
          </p>
          <a
            href="https://www.reddit.com/r/TheMemoryPalace/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 1.5rem", background: C.terracotta,
              color: "#FCFAF5", borderRadius: "0.5rem", textDecoration: "none",
              fontFamily: F.body, fontSize: "0.875rem", fontWeight: 600,
              transition: "opacity 0.2s",
            }}
          >
            {t("communityBtn")}
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.sandstone}30`, padding: "1.5rem",
        textAlign: "center", fontSize: "0.75rem", color: C.muted,
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "0.5rem" }}>
          <Link href="/privacy" style={{ color: C.muted, textDecoration: "none" }}>{t("footerPrivacy")}</Link>
          <Link href="/terms" style={{ color: C.muted, textDecoration: "none" }}>{t("footerTerms")}</Link>
          <Link href="/security" style={{ color: C.muted, textDecoration: "none" }}>{t("footerSecurity")}</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} The Memory Palace</p>
      </footer>
    </div>
  );
}
