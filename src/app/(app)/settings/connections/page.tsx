"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

// ── Provider definitions ──
type ProviderIconKey = "photos" | "dropbox" | "cloud" | "folder" | "apple";

interface ProviderDef {
  id: string;
  name: string;
  descKey: string;
  iconKey: ProviderIconKey;
  accentColor: string;
  connectUrl: string;
  browseType: "photos" | "files";
  comingSoon?: boolean;
}

function ProviderIcon({ name, color, size = 26 }: { name: ProviderIconKey; color: string; size?: number }) {
  const s = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "photos":
      return (
        <svg {...s}>
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <circle cx="12" cy="13" r="4" />
          <path d="M8 6l1.5-2h5L16 6" />
        </svg>
      );
    case "dropbox":
      return (
        <svg {...s}>
          <path d="M7 3l5 3-5 3-5-3 5-3z" />
          <path d="M17 3l5 3-5 3-5-3 5-3z" />
          <path d="M7 11l5 3-5 3-5-3 5-3z" />
          <path d="M17 11l5 3-5 3-5-3 5-3z" />
          <path d="M7 19l5 3 5-3" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...s}>
          <path d="M17.5 19a4.5 4.5 0 00.5-8.97A6 6 0 006 11a4 4 0 00.5 7.97h11z" />
        </svg>
      );
    case "folder":
      return (
        <svg {...s}>
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      );
    case "apple":
      return (
        <svg {...s} fill={color} stroke="none">
          <path d="M16.5 12.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.8.9-3.6.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1.9-4 2.4-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.6-3.9zM14 5.3c.6-.8 1.1-1.9 1-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.9-1 2.9 1.1.1 2.2-.5 2.8-1.3z" />
        </svg>
      );
  }
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "google_photos",
    name: "Google Photos",
    descKey: "googlePhotosDesc",
    iconKey: "photos",
    accentColor: "#4285F4",
    connectUrl: "/api/integrations/google/connect",
    browseType: "photos",
    comingSoon: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    descKey: "dropboxDesc",
    iconKey: "dropbox",
    accentColor: "#0061FF",
    connectUrl: "/api/integrations/dropbox/connect",
    browseType: "files",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    descKey: "onedriveDesc",
    iconKey: "cloud",
    accentColor: "#0078D4",
    connectUrl: "/api/integrations/onedrive/connect",
    browseType: "files",
  },
  {
    id: "box",
    name: "Box",
    descKey: "boxDesc",
    iconKey: "folder",
    accentColor: "#0061D5",
    connectUrl: "/api/integrations/box/connect",
    browseType: "files",
    comingSoon: true,
  },
  {
    id: "apple_photos",
    name: "Apple Photos",
    descKey: "applePhotosDesc",
    iconKey: "apple",
    accentColor: "#999999",
    connectUrl: "",
    browseType: "photos",
    comingSoon: true,
  },
];

interface ConnectedAccount {
  id: string;
  provider: string;
  provider_email: string | null;
  connected_at: string;
  last_sync_at: string | null;
  metadata: Record<string, unknown>;
}

export default function ConnectionsPage() {
  const { t } = useTranslation("connections");
  return (
    <Suspense fallback={<div style={{padding:"2.5rem",textAlign:"center",fontFamily:T.font.body,color:T.color.muted}}>{t("loading")}</div>}>
      <ConnectionsContent />
    </Suspense>
  );
}

function ConnectionsContent() {
  const { t, locale } = useTranslation("connections");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [appleGuide, setAppleGuide] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle URL params from OAuth callbacks
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const provider = PROVIDERS.find((p) => p.id === connected);
      setToast({
        message: t("connectedSuccess", { provider: provider?.name || connected }),
        type: "success",
      });
      fetchAccounts();
      // Clean up URL
      window.history.replaceState({}, "", "/settings/connections");
    }
    if (error) {
      setToast({ message: t("connectionFailedGeneric"), type: "error" });
      window.history.replaceState({}, "", "/settings/connections");
    }
  }, [searchParams, fetchAccounts]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleDisconnect = async (provider: string) => {
    setConfirmDisconnect(null);
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/integrations/accounts?provider=${provider}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.provider !== provider));
        const p = PROVIDERS.find((p) => p.id === provider);
        setToast({ message: t("disconnected", { provider: p?.name || provider }), type: "success" });
      } else {
        setToast({ message: t("disconnectFailed"), type: "error" });
      }
    } catch {
      setToast({ message: t("disconnectFailed"), type: "error" });
    }
    setDisconnecting(null);
  };

  const connectedMap = new Map(accounts.map((a) => [a.provider, a]));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? "#4A6741" : "#A63D3D",
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={tc("close")} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: "0.875rem", cursor: "pointer", marginLeft: "0.5rem", opacity: 0.7,
            minWidth: "2.75rem", minHeight: "2.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header — desktop only */}
      {!isMobile && (
        <div style={{ marginBottom: "1.75rem" }}>
          <h2 style={{
            fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 0.5rem",
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("description")}
          </p>
        </div>
      )}

      {/* Provider cards */}
      {loading ? (
        <div style={{
          textAlign: "center", padding: "3rem",
          fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
        }}>
          {t("loading")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {PROVIDERS.map((provider) => {
            const account = connectedMap.get(provider.id);
            const isConnected = !!account;
            const isApple = provider.id === "apple_photos";
            const isComingSoon = !!provider.comingSoon;

            return (
              <div key={provider.id} style={{
                background: T.color.white,
                borderRadius: "1rem",
                border: `1px solid ${isConnected ? `${provider.accentColor}30` : T.color.cream}`,
                padding: "1.25rem 1.5rem",
                boxShadow: isConnected
                  ? `0 0.125rem 0.75rem ${provider.accentColor}10`
                  : "0 0.125rem 0.5rem rgba(44,44,42,.04)",
                transition: "all .2s",
                ...(isComingSoon ? { opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" as const } : {}),
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {/* Icon */}
                  <div style={{
                    width: "3.25rem", height: "3.25rem", borderRadius: "0.875rem", flexShrink: 0,
                    background: isConnected
                      ? `${provider.accentColor}12`
                      : T.color.warmStone,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: isConnected ? `2px solid ${provider.accentColor}25` : "none",
                  }}>
                    <ProviderIcon name={provider.iconKey} color={isConnected ? provider.accentColor : T.color.muted} size={26} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
                      <h3 style={{
                        fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600,
                        color: T.color.charcoal, margin: 0,
                      }}>
                        {provider.name}
                      </h3>
                      {isConnected && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.25rem",
                          padding: "0.1875rem 0.625rem", borderRadius: "1.25rem",
                          background: "#4A674115", color: "#4A6741",
                          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                        }}>
                          <span aria-hidden="true" style={{ fontSize: "0.625rem" }}>{"\u2713"}</span>
                          {t("connected")}
                        </span>
                      )}
                      {isComingSoon && !isConnected && (
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "0.1875rem 0.625rem", borderRadius: "1.25rem",
                          background: `${T.color.sandstone}30`,
                          color: T.color.muted,
                          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500,
                          fontStyle: "italic",
                        }}>
                          {t("comingSoon")}
                        </span>
                      )}
                    </div>

                    <p style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                      margin: 0, lineHeight: 1.4,
                    }}>
                      {t(provider.descKey)}
                    </p>

                    {/* Connection details */}
                    {isConnected && account && (
                      <div style={{
                        display: "flex", gap: "1rem", marginTop: "0.5rem",
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                      }}>
                        {account.provider_email && (
                          <span>{account.provider_email}</span>
                        )}
                        <span>{t("connectedDate", { date: formatRelativeDate(account.connected_at, t, locale) })}</span>
                        {account.last_sync_at && (
                          <span>{t("lastImport", { date: formatRelativeDate(account.last_sync_at, t, locale) })}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div style={{ flexShrink: 0 }}>
                    {isApple ? (
                      <button
                        onClick={() => setAppleGuide(!appleGuide)}
                        style={{
                          padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
                          border: `1px solid ${T.color.cream}`,
                          background: T.color.warmStone,
                          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                          color: T.color.charcoal, cursor: "pointer",
                          transition: "all .15s", minHeight: "2.75rem",
                        }}
                      >
                        {appleGuide ? t("hideGuide") : t("viewGuide")}
                      </button>
                    ) : isConnected ? (
                      <button
                        onClick={() => setConfirmDisconnect(provider.id)}
                        disabled={disconnecting === provider.id}
                        style={{
                          padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
                          border: `1px solid #A63D3D33`,
                          background: "#A63D3D08",
                          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                          color: "#A63D3D", cursor: "pointer",
                          opacity: disconnecting === provider.id ? 0.5 : 1,
                          transition: "all .15s", minHeight: "2.75rem",
                        }}
                      >
                        {disconnecting === provider.id ? t("disconnecting") : t("disconnect")}
                      </button>
                    ) : (
                      <a
                        href={provider.connectUrl}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
                          border: "none",
                          background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                          color: "#FFF", cursor: "pointer",
                          textDecoration: "none",
                          transition: "all .15s", minHeight: "2.75rem",
                        }}
                      >
                        {t("connect")}
                      </a>
                    )}
                  </div>
                </div>

                {/* Apple Photos guide (expanded) */}
                {isApple && appleGuide && (
                  <div style={{
                    marginTop: "1rem", paddingTop: "1rem",
                    borderTop: `1px solid ${T.color.cream}`,
                  }}>
                    <ApplePhotosGuide />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div style={{
        marginTop: "2rem", padding: "1rem 1.25rem", borderRadius: "0.75rem",
        background: `${T.color.terracotta}08`,
        border: `1px solid ${T.color.terracotta}15`,
      }}>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut,
          margin: 0, lineHeight: 1.5,
        }}>
          {t("privacyNote")}
        </p>
      </div>

      {/* Disconnect confirmation dialog */}
      {confirmDisconnect && (() => {
        const provider = PROVIDERS.find((p) => p.id === confirmDisconnect);
        return (
          <ConfirmModal
            title={t("disconnectConfirmTitle")}
            body={t("disconnectConfirmBody", { provider: provider?.name || confirmDisconnect })}
            confirmLabel={t("disconnect")}
            cancelLabel={tc("cancel")}
            onConfirm={() => handleDisconnect(confirmDisconnect)}
            onCancel={() => setConfirmDisconnect(null)}
          />
        );
      })()}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-0.5rem); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Apple Photos guide sub-component ──
function ApplePhotosGuide() {
  const { t } = useTranslation("connections");
  const [platform, setPlatform] = useState<"mac" | "iphone" | "icloud">("mac");

  const guides: Record<string, { titleKey: string; stepsKey: string }> = {
    mac: { titleKey: "appleFromMac", stepsKey: "appleMacSteps" },
    iphone: { titleKey: "appleFromIphone", stepsKey: "appleIphoneSteps" },
    icloud: { titleKey: "appleFromIcloud", stepsKey: "appleIcloudSteps" },
  };

  const guide = guides[platform];
  const steps = t(guide.stepsKey).split("|");

  return (
    <div>
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.875rem" }}>
        {(Object.keys(guides) as Array<keyof typeof guides>).map((key) => (
          <button key={key} onClick={() => setPlatform(key as typeof platform)} style={{
            padding: "0.375rem 0.875rem", borderRadius: "0.5rem",
            border: platform === key ? `1px solid ${T.color.terracotta}40` : `1px solid ${T.color.cream}`,
            background: platform === key ? `${T.color.terracotta}10` : T.color.warmStone,
            fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: platform === key ? 600 : 400,
            color: platform === key ? T.color.terracotta : T.color.muted,
            cursor: "pointer", transition: "all .15s", minHeight: "2.75rem",
          }}>
            {t(guides[key].titleKey)}
          </button>
        ))}
      </div>

      <ol style={{
        margin: 0, paddingLeft: "1.25rem",
        fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
        lineHeight: 1.8,
      }}>
        {steps.map((step, i) => (
          <li key={i} style={{ paddingLeft: "0.25rem" }}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

// ── Confirm Modal ──
function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key === "Tab") {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(44,44,42,.35)", backdropFilter: "blur(0.125rem)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: T.color.linen, borderRadius: "1rem",
        padding: "1.75rem 2rem", maxWidth: "26rem", width: "90%",
        boxShadow: "0 1rem 3rem rgba(44,44,42,.18)",
        border: `1px solid ${T.color.cream}`,
        animation: "fadeIn .2s ease",
      }}>
        <h4 style={{
          fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 0.75rem",
        }}>
          {title}
        </h4>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.walnut,
          margin: "0 0 1.5rem", lineHeight: 1.6,
        }}>
          {body}
        </p>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
            border: `1px solid ${T.color.cream}`, background: "transparent",
            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
            color: T.color.muted, cursor: "pointer", transition: "all .15s",
            minHeight: "2.75rem",
          }}>
            {cancelLabel}
          </button>
          <button ref={confirmBtnRef} onClick={onConfirm} style={{
            padding: "0.625rem 1.25rem", borderRadius: "0.625rem",
            border: "1px solid #A63D3D33",
            background: "#A63D3D10",
            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
            color: "#A63D3D", cursor: "pointer", transition: "all .15s",
            minHeight: "2.75rem",
          }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(iso: string, t: (key: string, params?: Record<string, string>) => string, locale?: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 7) return t("daysAgo", { count: String(diffDays) });
  if (diffDays < 30) return t("weeksAgo", { count: String(Math.floor(diffDays / 7)) });
  const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
  return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" });
}
