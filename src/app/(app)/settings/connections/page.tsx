"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { isIOS } from "@/lib/native/platform";

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
    <Suspense fallback={<div style={{padding:"2.5rem",textAlign:"center",fontFamily:T.font.body,color:"#716A5E"}}>{t("loading")}</div>}>
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
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
  // Hide not-yet-shipped "coming soon" providers on iOS (Apple Guideline 2.3.1).
  const [hideComingSoon, setHideComingSoon] = useState(false);
  useEffect(() => { setHideComingSoon(isIOS()); }, []);

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
    <div className="conn-page">
      {/* Toast */}
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} className="conn-fade" style={{
          position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 100,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? "#56683C" : "#A63D3D", // Atrium token: sage
          color: "#FFF",
          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: "0.625rem",
        }}>
          <span aria-hidden="true">{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={tc("close")} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.75)",
            fontSize: "0.8125rem", cursor: "pointer", marginLeft: "0.5rem",
            minWidth: "2.75rem", minHeight: "2.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header — desktop only */}
      {!isMobile && (
        <div style={{ marginBottom: "1.75rem" }}>
          <h2 style={{
            fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600,
            color: "#403B36", margin: "0 0 0.5rem", lineHeight: 1.15, // Atrium token: ink display
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E",
            margin: 0, lineHeight: 1.4,
          }}>
            {t("description")}
          </p>
        </div>
      )}

      {/* Provider cards */}
      {loading ? (
        <div style={{
          textAlign: "center", padding: "3rem",
          fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E",
        }}>
          {t("loading")}
        </div>
      ) : hideComingSoon ? (
        // On iOS the cloud OAuth connect flows are raw web redirects — hide the grid
        // and show a neutral note instead of dead/heavyweight web surfaces (4.2 / 2.3.1).
        <div style={{ textAlign: "center", padding: "2rem", fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E", lineHeight: 1.4 }}>
          {t("cloudUnavailableNative") !== "cloudUnavailableNative" ? t("cloudUnavailableNative") : "Connecting external cloud photo services isn’t available in the app. You can still add photos and videos directly from your device."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {PROVIDERS.map((provider) => {
            const account = connectedMap.get(provider.id);
            const isConnected = !!account;
            const isComingSoon = !!provider.comingSoon;

            return (
              <div key={provider.id} style={{
                background: "#FFFFFF",
                borderRadius: "1rem",
                border: "0.0625rem solid #E3D6BC", // Atrium token: hairline
                padding: isMobile ? "1rem" : "1.25rem 1.5rem",
                boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S1 + top highlight
                transition: "all .2s ease",
                ...(isComingSoon ? { opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" as const } : {}),
              }}>
                <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "0.75rem" : "1rem", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                  {/* Icon */}
                  <div style={{
                    width: "3.25rem", height: "3.25rem", borderRadius: "0.85rem", flexShrink: 0,
                    background: isConnected
                      ? `${provider.accentColor}12`
                      : "#F6EBE3", // Atrium token: recessed tray
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: isConnected ? `0.125rem solid ${provider.accentColor}25` : "none",
                  }}>
                    <ProviderIcon name={provider.iconKey} color={isConnected ? provider.accentColor : "#716A5E"} size={26} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
                      <h3 style={{
                        fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
                        color: "#403B36", margin: 0, // Atrium token: titleM ink
                      }}>
                        {provider.name}
                      </h3>
                      {isConnected && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.25rem",
                          padding: "0.1875rem 0.625rem", borderRadius: "2rem",
                          background: "rgba(86,104,60,0.16)", color: "#56683C", // Atrium token: sage
                          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                        }}>
                          <span aria-hidden="true" style={{ fontSize: "0.625rem" }}>{"\u2713"}</span>
                          {t("connected")}
                        </span>
                      )}
                      {isComingSoon && !isConnected && (
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "0.1875rem 0.625rem", borderRadius: "2rem",
                          background: "#F6EBE3", // Atrium token: recessed tray
                          color: "#716A5E",
                          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500,
                          fontStyle: "italic",
                        }}>
                          {t("comingSoon")}
                        </span>
                      )}
                    </div>

                    <p style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                      margin: 0, lineHeight: 1.4,
                    }}>
                      {t(provider.descKey)}
                    </p>

                    {/* Connection details */}
                    {isConnected && account && (
                      <div style={{
                        display: "flex", gap: isMobile ? "0.5rem" : "1rem", marginTop: "0.5rem",
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", // Atrium token: meta
                        flexWrap: "wrap",
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
                  <div style={{ flexShrink: 0, ...(isMobile ? { width: "100%" } : {}) }}>
                    {isConnected ? (
                      <button
                        onClick={() => setConfirmDisconnect(provider.id)}
                        disabled={disconnecting === provider.id}
                        className="conn-danger"
                        style={{
                          padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                          border: `0.0625rem solid #A63D3D33`,
                          background: "#A63D3D08",
                          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                          color: "#A63D3D", cursor: "pointer",
                          opacity: disconnecting === provider.id ? 0.5 : 1,
                          transition: "all .2s ease", minHeight: "2.75rem",
                        }}
                      >
                        {disconnecting === provider.id ? t("disconnecting") : t("disconnect")}
                      </button>
                    ) : (
                      <a
                        href={provider.connectUrl}
                        className="conn-primary"
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                          border: "none",
                          background: "linear-gradient(135deg, #B85C38, #9A4F2A)", // Atrium token: ember → terracotta
                          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                          color: "#FFF", cursor: "pointer",
                          textDecoration: "none",
                          transition: "all .2s ease", minHeight: "2.75rem",
                        }}
                      >
                        {t("connect")}
                      </a>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div style={{
        marginTop: "2rem", padding: "1rem 1.25rem", borderRadius: "0.75rem",
        background: "#FBF2EC", // Atrium: pre-mixed terracotta wash, no alpha band
        border: "0.0625rem solid #E7D9C4", // Atrium token: terracotta-zone hairline
      }}>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
          margin: 0, lineHeight: 1.4,
        }}>
          {t("privacyNote")}
        </p>
      </div>

      {/* Apple Photos note */}
      <div style={{
        marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: "0.75rem",
        background: "#F6EBE3", // Atrium token: recessed tray
        border: "0.0625rem solid #E3D6BC", // Atrium token: hairline
        display: "flex", alignItems: "center", gap: "0.875rem",
      }}>
        <ProviderIcon name="apple" color={"#716A5E"} size={22} />
        <p style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
          margin: 0, lineHeight: 1.4,
        }}>
          {t("applePhotosNote")}
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
        @media (prefers-reduced-motion: reduce) { .conn-fade { animation: none !important; } .conn-page * { transition: none !important; } }
        @media (hover: hover) {
          .conn-primary:hover { box-shadow: 0 0.25rem 1rem rgba(64,59,54,0.14); }
          .conn-secondary:hover { background: rgba(154,79,42,0.07) !important; }
          .conn-danger:hover:not(:disabled) { background: rgba(166,61,61,0.12) !important; }
        }
        .conn-secondary:active { background: rgba(154,79,42,0.12) !important; }
        .conn-page a:focus-visible, .conn-page button:focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: 0.1875rem; }
      `}</style>
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
        background: "rgba(64,59,54,0.35)", // Atrium token: warm ink scrim
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="conn-fade" style={{
        background: "#FCFAF5", borderRadius: "1rem", // Atrium token: cream
        padding: "1.75rem 2rem", maxWidth: "26rem", width: "90%",
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
        border: "0.0625rem solid #E3D6BC", // Atrium token: hairline
        animation: "fadeIn .2s ease",
      }}>
        <h4 style={{
          fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600,
          color: "#403B36", margin: "0 0 0.75rem", lineHeight: 1.15, // Atrium token: titleM ink
        }}>
          {title}
        </h4>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E",
          margin: "0 0 1.5rem", lineHeight: 1.4,
        }}>
          {body}
        </p>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="conn-secondary" style={{
            padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
            border: "0.0625rem solid #E3D6BC", background: "transparent", // Atrium token: hairline
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
            color: "#716A5E", cursor: "pointer", transition: "all .2s ease",
            minHeight: "2.75rem",
          }}>
            {cancelLabel}
          </button>
          <button ref={confirmBtnRef} onClick={onConfirm} className="conn-danger" style={{
            padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
            border: "0.0625rem solid #A63D3D33",
            background: "#A63D3D10",
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
            color: "#A63D3D", cursor: "pointer", transition: "all .2s ease",
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
  const dateLocale = localeDateCodes[locale as Locale];
  return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" });
}
