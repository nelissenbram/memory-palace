"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@/lib/theme";

// ── Provider definitions ──
interface ProviderDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  connectUrl: string;
  browseType: "photos" | "files";
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "google_photos",
    name: "Google Photos",
    description: "Import photos and videos from your Google Photos library.",
    icon: "\u{1F4F8}",
    accentColor: "#4285F4",
    connectUrl: "/api/integrations/google/connect",
    browseType: "photos",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Browse and import files from your Dropbox storage.",
    icon: "\u{1F4E6}",
    accentColor: "#0061FF",
    connectUrl: "/api/integrations/dropbox/connect",
    browseType: "files",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Access photos and documents from your Microsoft OneDrive.",
    icon: "\u2601\uFE0F",
    accentColor: "#0078D4",
    connectUrl: "/api/integrations/onedrive/connect",
    browseType: "files",
  },
  {
    id: "box",
    name: "Box",
    description: "Import files from your Box cloud storage.",
    icon: "\u{1F4C1}",
    accentColor: "#0061D5",
    connectUrl: "/api/integrations/box/connect",
    browseType: "files",
  },
  {
    id: "apple_photos",
    name: "Apple Photos",
    description: "Export from Apple Photos app, then upload via Mass Import.",
    icon: "\u{1F34E}",
    accentColor: "#999999",
    connectUrl: "",
    browseType: "photos",
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
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:"center",fontFamily:T.font.body,color:T.color.muted}}>Loading connections...</div>}>
      <ConnectionsContent />
    </Suspense>
  );
}

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [appleGuide, setAppleGuide] = useState(false);

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
        message: `${provider?.name || connected} connected successfully!`,
        type: "success",
      });
      fetchAccounts();
      // Clean up URL
      window.history.replaceState({}, "", "/settings/connections");
    }
    if (error) {
      setToast({ message: `Connection failed: ${error}`, type: "error" });
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
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/integrations/accounts?provider=${provider}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.provider !== provider));
        const p = PROVIDERS.find((p) => p.id === provider);
        setToast({ message: `${p?.name || provider} disconnected.`, type: "success" });
      } else {
        setToast({ message: "Failed to disconnect. Please try again.", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to disconnect. Please try again.", type: "error" });
    }
    setDisconnecting(null);
  };

  const connectedMap = new Map(accounts.map((a) => [a.provider, a]));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? "#4A6741" : "#C05050",
          color: "#FFF",
          fontFamily: T.font.body, fontSize: 13, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: 14, cursor: "pointer", marginLeft: 8, opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 28, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 8px",
        }}>
          Connected Accounts
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          Link your cloud storage and photo services to import memories directly into your palace.
          Your files remain in their original location — we only copy what you choose to import.
        </p>
      </div>

      {/* Provider cards */}
      {loading ? (
        <div style={{
          textAlign: "center", padding: 48,
          fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
        }}>
          Loading your connections...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PROVIDERS.map((provider) => {
            const account = connectedMap.get(provider.id);
            const isConnected = !!account;
            const isApple = provider.id === "apple_photos";

            return (
              <div key={provider.id} style={{
                background: T.color.white,
                borderRadius: 16,
                border: `1px solid ${isConnected ? `${provider.accentColor}30` : T.color.cream}`,
                padding: "20px 24px",
                boxShadow: isConnected
                  ? `0 2px 12px ${provider.accentColor}10`
                  : "0 2px 8px rgba(44,44,42,.04)",
                transition: "all .2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: isConnected
                      ? `${provider.accentColor}12`
                      : T.color.warmStone,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24,
                    border: isConnected ? `2px solid ${provider.accentColor}25` : "none",
                  }}>
                    {provider.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h3 style={{
                        fontFamily: T.font.display, fontSize: 18, fontWeight: 600,
                        color: T.color.charcoal, margin: 0,
                      }}>
                        {provider.name}
                      </h3>
                      {isConnected && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 10px", borderRadius: 20,
                          background: "#4A674115", color: "#4A6741",
                          fontFamily: T.font.body, fontSize: 11, fontWeight: 600,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: 3,
                            background: "#4A6741", display: "inline-block",
                          }} />
                          Connected
                        </span>
                      )}
                    </div>

                    <p style={{
                      fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
                      margin: 0, lineHeight: 1.4,
                    }}>
                      {provider.description}
                    </p>

                    {/* Connection details */}
                    {isConnected && account && (
                      <div style={{
                        display: "flex", gap: 16, marginTop: 8,
                        fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                      }}>
                        {account.provider_email && (
                          <span>{account.provider_email}</span>
                        )}
                        <span>Connected {formatRelativeDate(account.connected_at)}</span>
                        {account.last_sync_at && (
                          <span>Last import {formatRelativeDate(account.last_sync_at)}</span>
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
                          padding: "10px 20px", borderRadius: 10,
                          border: `1px solid ${T.color.cream}`,
                          background: T.color.warmStone,
                          fontFamily: T.font.body, fontSize: 13, fontWeight: 500,
                          color: T.color.charcoal, cursor: "pointer",
                          transition: "all .15s",
                        }}
                      >
                        {appleGuide ? "Hide Guide" : "View Guide"}
                      </button>
                    ) : isConnected ? (
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        disabled={disconnecting === provider.id}
                        style={{
                          padding: "10px 20px", borderRadius: 10,
                          border: `1px solid #C0505033`,
                          background: "#C0505008",
                          fontFamily: T.font.body, fontSize: 13, fontWeight: 500,
                          color: "#C05050", cursor: "pointer",
                          opacity: disconnecting === provider.id ? 0.5 : 1,
                          transition: "all .15s",
                        }}
                      >
                        {disconnecting === provider.id ? "Disconnecting..." : "Disconnect"}
                      </button>
                    ) : (
                      <a
                        href={provider.connectUrl}
                        style={{
                          display: "inline-block",
                          padding: "10px 20px", borderRadius: 10,
                          border: "none",
                          background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                          fontFamily: T.font.body, fontSize: 13, fontWeight: 600,
                          color: "#FFF", cursor: "pointer",
                          textDecoration: "none",
                          transition: "all .15s",
                        }}
                      >
                        Connect
                      </a>
                    )}
                  </div>
                </div>

                {/* Apple Photos guide (expanded) */}
                {isApple && appleGuide && (
                  <div style={{
                    marginTop: 16, paddingTop: 16,
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
        marginTop: 32, padding: "16px 20px", borderRadius: 12,
        background: `${T.color.terracotta}08`,
        border: `1px solid ${T.color.terracotta}15`,
      }}>
        <p style={{
          fontFamily: T.font.body, fontSize: 12, color: T.color.walnut,
          margin: 0, lineHeight: 1.5,
        }}>
          <strong>Privacy note:</strong> Memory Palace only accesses your files when you explicitly choose
          to import them. We never scan, index, or store your cloud files without your direct action.
          You can disconnect any service at any time.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Apple Photos guide sub-component ──
function ApplePhotosGuide() {
  const [platform, setPlatform] = useState<"mac" | "iphone" | "icloud">("mac");

  const guides: Record<string, { title: string; steps: string[] }> = {
    mac: {
      title: "From Mac",
      steps: [
        "Open the Photos app on your Mac.",
        "Select the photos you would like to import.",
        "Go to File \u2192 Export \u2192 Export Unmodified Originals.",
        "Save them to a folder on your computer.",
        "Return to Memory Palace and use the Mass Import panel to upload.",
      ],
    },
    iphone: {
      title: "From iPhone / iPad",
      steps: [
        "Open the Photos app on your device.",
        "Tap 'Select' and choose the photos you want.",
        "Tap the Share button and choose 'Save to Files'.",
        "Save them to iCloud Drive or another accessible location.",
        "On your computer, open Memory Palace and use Mass Import to upload.",
      ],
    },
    icloud: {
      title: "From iCloud.com",
      steps: [
        "Visit icloud.com/photos in your web browser.",
        "Sign in with your Apple ID.",
        "Select the photos you want to import.",
        "Click the download button to save them to your computer.",
        "Return to Memory Palace and use the Mass Import panel to upload.",
      ],
    },
  };

  const guide = guides[platform];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(Object.keys(guides) as Array<keyof typeof guides>).map((key) => (
          <button key={key} onClick={() => setPlatform(key as typeof platform)} style={{
            padding: "6px 14px", borderRadius: 8,
            border: platform === key ? `1px solid ${T.color.terracotta}40` : `1px solid ${T.color.cream}`,
            background: platform === key ? `${T.color.terracotta}10` : T.color.warmStone,
            fontFamily: T.font.body, fontSize: 12, fontWeight: platform === key ? 600 : 400,
            color: platform === key ? T.color.terracotta : T.color.muted,
            cursor: "pointer", transition: "all .15s",
          }}>
            {guides[key].title}
          </button>
        ))}
      </div>

      <ol style={{
        margin: 0, paddingLeft: 20,
        fontFamily: T.font.body, fontSize: 13, color: T.color.charcoal,
        lineHeight: 1.8,
      }}>
        {guide.steps.map((step, i) => (
          <li key={i} style={{ paddingLeft: 4 }}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
