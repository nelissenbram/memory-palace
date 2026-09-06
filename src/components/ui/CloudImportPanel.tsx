"use client";

import { useState, useEffect, useCallback, useRef, type ReactElement } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { createClient } from "@/lib/supabase/client";
import { isIOS } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { track } from "@/lib/analytics";
import Image from "next/image";

// ── Types ──
interface ConnectedAccount {
  id: string;
  provider: string;
  provider_email: string | null;
  connected_at: string;
  last_sync_at: string | null;
}

interface CloudItem {
  id: string;
  name: string;
  filename?: string;
  thumbnailUrl?: string;
  isFolder?: boolean;
  isImage?: boolean;
  isVideo?: boolean;
  isMedia?: boolean;
  size?: number;
  mimeType?: string;
  createdAt?: string;
  modified?: string;
  path?: string;
  childCount?: number;
}

interface ImportResult {
  id: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
  memoryId?: string;
}

// Helper: detect if an import error is actually a "skipped" (non-fatal) result
function isSkippedResult(r: ImportResult): boolean {
  if (r.skipped) return true;
  if (!r.error) return false;
  const lower = r.error.toLowerCase();
  return lower.includes("already imported") || lower.includes("already exists") ||
    lower.includes("duplicate") || lower.includes("skipped");
}

// WCAG AA compliant alternative to T.color.muted on linen backgrounds
const MUTED_AA = "#716A5E"; // Atrium token: muted ink, full opacity

const CloseGlyph = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

interface Props {
  onClose: () => void;
  embedded?: boolean;
}

// ── Cloud provider brand marks (SVG, not OS emoji) — mirrors ImportHub's
// vocabulary so the whole Import surface speaks one glyph language. Framed in a
// hairline cream pill at the call site so the loud brand colors read as
// intentional badges against the muted Tuscan palette. ──
const GooglePhotosMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 7.5V1.5A4.5 4.5 0 007.5 6v1.5H12z" fill="#EA4335" />
    <path d="M16.5 12H22.5A4.5 4.5 0 0018 7.5H16.5V12z" fill="#4285F4" />
    <path d="M12 16.5V22.5A4.5 4.5 0 0016.5 18V16.5H12z" fill="#34A853" />
    <path d="M7.5 12H1.5A4.5 4.5 0 006 16.5H7.5V12z" fill="#FBBC05" />
  </svg>
);
const DropboxMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FE" />
    <path d="M6 6l6 4-6 4" fill="#0061FE" opacity="0.7" />
    <path d="M18 6l-6 4 6 4" fill="#0061FE" opacity="0.7" />
  </svg>
);
const OneDriveMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 17h10a4 4 0 000-8 5 5 0 00-9.5-1A4 4 0 005 12.5 3.5 3.5 0 005 19" stroke="#0078D4" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);
const BoxMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z" stroke="#0061D5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 7.5L12 12l9-4.5M12 12v9" stroke="#0061D5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── File-list line-art glyphs (terracotta, matches ImportHub / MassImport) ──
const MI_GLYPH = "#9A4F2A"; // Atrium token: terracotta glyph (at-rest)
const FolderMark = ({ size = 18, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);
const ImageMark = ({ size = 18, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const VideoMark = ({ size = 18, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="15" height="14" rx="2" />
    <path d="M23 7l-6 5 6 5V7z" />
  </svg>
);
const FileMark = ({ size = 18, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const CloudHeaderGlyph = ({ size = 22, color = "#FCFAF5" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 18h10a4 4 0 000-8 5 5 0 00-9.5-1.2A3.5 3.5 0 007 18z" />
    <path d="M12 10v6M9.5 13.5L12 16l2.5-2.5" />
  </svg>
);
const CheckCircleMark = ({ size = 48, color = "#56683C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="24" cy="24" r="19" />
    <path d="M15 24l6 6 12-13" />
  </svg>
);
const WarningMark = ({ size = 48, color = "#A63D3D" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M24 6L4 42h40L24 6z" />
    <path d="M24 20v10M24 36h.01" />
  </svg>
);
const LinkMark = ({ size = 40, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 23a6 6 0 008.5.6l4-4a6 6 0 00-8.5-8.5l-2 2" />
    <path d="M23 17a6 6 0 00-8.5-.6l-4 4a6 6 0 008.5 8.5l2-2" />
  </svg>
);

// ── Provider metadata ── (Icon is a small SVG brand-mark component)
const PROVIDER_META: Record<string, { name: string; Icon: (p: { size?: number }) => ReactElement; accent: string }> = {
  google_photos: { name: "Google Photos", Icon: GooglePhotosMark, accent: "#4285F4" },
  dropbox: { name: "Dropbox", Icon: DropboxMark, accent: "#0061FF" },
  onedrive: { name: "OneDrive", Icon: OneDriveMark, accent: "#0078D4" },
  box: { name: "Box", Icon: BoxMark, accent: "#0061D5" },
};

const BROWSE_ENDPOINTS: Record<string, string> = {
  google_photos: "/api/integrations/google/photos",
  dropbox: "/api/integrations/dropbox/browse",
  onedrive: "/api/integrations/onedrive/browse",
  box: "/api/integrations/box/browse",
};

const IMPORT_ENDPOINTS: Record<string, string> = {
  google_photos: "/api/integrations/google/import",
  dropbox: "/api/integrations/dropbox/import",
  onedrive: "/api/integrations/onedrive/import",
  box: "/api/integrations/box/import",
};

function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

// On iOS, until IAP is live (IAP_ENABLED), expose only the free Google Photos
// import so no paid (Keeper) provider — with its upgrade badge, "Upgrade to
// Keeper" CTA and /pricing steering — can render (Apple 3.1.1 / 3.1.3). Once
// IAP_ENABLED, /pricing serves the IAP paywall, so paid providers may show and
// steer there. Single source of truth so initial load and retry cannot drift.
function filterAccountsForPlatform(raw: ConnectedAccount[]): ConnectedAccount[] {
  return isIOS() && !IAP_ENABLED
    ? raw.filter((a) => a.provider === "google_photos")
    : raw;
}

// ═══ Main CloudImportPanel ═══
export default function CloudImportPanel({ onClose, embedded }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("import");
  const { t: tp } = useTranslation("palace");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const { containerRef, handleKeyDown: handleTrapKeyDown } = useFocusTrap(!embedded);
  const { getWings, getWingRooms } = useRoomStore();
  const wings = getWings();

  const [userPlan, setUserPlan] = useState<string>("free");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // Browse state
  const [items, setItems] = useState<CloudItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    results: ImportResult[];
  } | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Abort controller + timeout for the (single-batch) cloud import POST so a
  // stalled request is recoverable via a Cancel button rather than hanging the
  // indeterminate bar forever.
  const importAbortRef = useRef<AbortController | null>(null);
  const importTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 3 minutes: generous for a batch download+import, still bounded so a truly
  // stalled request eventually surfaces a recoverable error.
  const IMPORT_TIMEOUT_MS = 3 * 60 * 1000;

  // Target room
  const [targetWingId, setTargetWingId] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");

  // Fetch connected accounts + user plan
  useEffect(() => {
    (async () => {
      try {
        const [accountsRes] = await Promise.all([
          fetch("/api/integrations/accounts"),
          // Fetch user plan from Supabase
          (async () => {
            try {
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                // maybeSingle(): users with zero subscription rows return null
                // (not a query error), so paid users are never wrongly gated
                // to "free" just because .single() threw on an empty result.
                const { data, error: planErr } = await supabase
                  .from("subscriptions")
                  .select("plan")
                  .eq("user_id", user.id)
                  .maybeSingle();
                if (planErr) throw planErr;
                if (data?.plan) setUserPlan(data.plan);
              }
            } catch { /* keep default "free" */ }
          })(),
        ]);
        if (accountsRes.ok) {
          const data = await accountsRes.json();
          const accs = filterAccountsForPlatform((data.accounts || []) as ConnectedAccount[]);
          setAccounts(accs);
          // Auto-select first connected account
          if (accs.length > 0) {
            setActiveProvider(accs[0].provider);
          }
        }
      } catch { setError(t("loadFailed")); }
      setLoadingAccounts(false);
    })();
  }, [t]);

  // Fetch items when provider changes
  const fetchItems = useCallback(async (provider: string, cursor?: string, folderId?: string) => {
    setLoadingItems(true);
    try {
      const endpoint = BROWSE_ENDPOINTS[provider];
      if (!endpoint) return;

      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (folderId) {
        if (provider === "onedrive") params.set("folderId", folderId);
        else if (provider === "dropbox") params.set("path", folderId);
        else if (provider === "box") params.set("folderId", folderId);
      }

      const url = `${endpoint}?${params}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const newItems: CloudItem[] = data.items || [];

        if (cursor) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        setNextCursor(data.nextCursor || null);
      } else {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        const scopeInfo = errBody.grantedScopes ? `\nScopes: ${errBody.grantedScopes}` : "";
        setError(`${errBody.error || `HTTP ${res.status}`}${scopeInfo}`);
      }
    } catch { setError(t("loadFailed")); }
    setLoadingItems(false);
  }, [t]);

  useEffect(() => {
    if (activeProvider) {
      setItems([]);
      setSelected(new Set());
      setFolderPath([]);
      setNextCursor(null);
      setImportProgress(null);
      setError(null);
      fetchItems(activeProvider);
    }
  }, [activeProvider, fetchItems]);

  // ── Selection helpers ──
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const selectableIds = items
      .filter((i) => !i.isFolder)
      .map((i) => i.id);
    setSelected(new Set(selectableIds));
  };

  const selectNone = () => setSelected(new Set());

  // ── Navigate into folder ──
  const openFolder = (item: CloudItem) => {
    const folderId = item.path || item.id;
    setFolderPath((prev) => [...prev, { id: folderId, name: item.name }]);
    setSelected(new Set());
    fetchItems(activeProvider!, undefined, folderId);
  };

  const navigateBack = (index: number) => {
    const newPath = folderPath.slice(0, index);
    setFolderPath(newPath);
    setSelected(new Set());
    const folderId = newPath.length > 0 ? newPath[newPath.length - 1].id : undefined;
    fetchItems(activeProvider!, undefined, folderId);
  };

  // ── Import ──
  const handleImport = async () => {
    if (!activeProvider || selected.size === 0 || !targetRoomId) return;

    setImporting(true);
    setImportProgress({ total: selected.size, succeeded: 0, failed: 0, results: [] });

    // Fresh abort controller + timeout guard for this import run.
    const controller = new AbortController();
    importAbortRef.current = controller;
    if (importTimeoutRef.current) clearTimeout(importTimeoutRef.current);
    importTimeoutRef.current = setTimeout(() => controller.abort("timeout"), IMPORT_TIMEOUT_MS);

    try {
      const endpoint = IMPORT_ENDPOINTS[activeProvider];
      if (!endpoint) return;

      // Build the request body based on provider
      let body: Record<string, unknown>;
      const selectedIds = Array.from(selected);

      if (activeProvider === "google_photos") {
        body = { photoIds: selectedIds, roomId: targetRoomId };
      } else if (activeProvider === "dropbox") {
        // For Dropbox, we need file paths
        const filePaths = items
          .filter((i) => selected.has(i.id))
          .map((i) => i.path || i.id);
        body = { filePaths, roomId: targetRoomId };
      } else if (activeProvider === "onedrive") {
        body = { itemIds: selectedIds, roomId: targetRoomId };
      } else {
        body = { fileIds: selectedIds, roomId: targetRoomId };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        setImportProgress({
          total: data.summary.total,
          succeeded: data.summary.succeeded,
          failed: data.summary.failed,
          results: data.results,
        });
        // Feature taxonomy: success moment = the import run finished with at
        // least one item imported. Provider is a fixed enum, no PII props
        // (no file names / counts of personal content beyond the provider).
        if ((data.summary?.succeeded ?? 0) > 0) {
          track("feature_used", {
            feature: "cloud_import",
            provider: activeProvider === "google_photos" ? "google" : activeProvider,
          });
        }
      } else {
        setImportProgress((prev) => prev ? {
          ...prev,
          failed: prev.total,
          results: [{ id: "error", success: false, error: t("importFailed") }],
        } : null);
      }
    } catch (err: unknown) {
      // A user-triggered abort clears the run (Cancel path handles its own
      // state) so we don't paint it as a failure; a timeout abort surfaces a
      // distinct, recoverable message.
      if (err instanceof DOMException && err.name === "AbortError") {
        const timedOut = controller.signal.reason === "timeout";
        if (timedOut) {
          setImportProgress((prev) => prev ? {
            ...prev,
            failed: prev.total,
            results: [{ id: "error", success: false, error: t("importTimeout") }],
          } : null);
        } else {
          // Cancel: reset so the user is back to selection and can retry.
          setImportProgress(null);
        }
      } else {
        setImportProgress((prev) => prev ? {
          ...prev,
          failed: prev.total,
          results: [{ id: "error", success: false, error: t("importFailed") }],
        } : null);
      }
    } finally {
      if (importTimeoutRef.current) { clearTimeout(importTimeoutRef.current); importTimeoutRef.current = null; }
      importAbortRef.current = null;
    }

    setImporting(false);
  };

  // Cancel a stalled/in-flight import: abort the request, clear progress and
  // return the user to selection so the import is recoverable.
  const cancelImport = () => {
    if (importTimeoutRef.current) { clearTimeout(importTimeoutRef.current); importTimeoutRef.current = null; }
    importAbortRef.current?.abort("cancel");
    importAbortRef.current = null;
    setImporting(false);
    setImportProgress(null);
  };

  // Clean up any pending timeout / in-flight request on unmount.
  useEffect(() => {
    return () => {
      if (importTimeoutRef.current) clearTimeout(importTimeoutRef.current);
      importAbortRef.current?.abort("unmount");
    };
  }, []);

  const isFileProvider = activeProvider && activeProvider !== "google_photos";
  const selectedSize = items
    .filter((i) => selected.has(i.id))
    .reduce((sum, i) => sum + (i.size || 0), 0);

  const content = (
    <>
        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium ember */,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem",
              }}><CloudHeaderGlyph size={22} /></div>
              <div>
                <h3 style={{
                  fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                  color: "#403B36" /* Atrium ink */, margin: 0,
                }}>{t("title")}</h3>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED_AA, margin: "0.125rem 0 0",
                }}>
                  {importing
                    ? t("importing")
                    : importProgress
                    ? t("successCount", { succeeded: String(importProgress.succeeded), total: String(importProgress.total) })
                    : t("browseDescription")}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem",
              border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.warmStone,
              color: "#716A5E" /* Atrium muted */, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><CloseGlyph size={16} /></button>
          </div>

          {/* Provider tabs */}
          {!loadingAccounts && accounts.length > 0 && (
            <div style={{
              display: "flex", gap: "0.25rem", marginBottom: "1rem",
              background: T.color.warmStone, borderRadius: "0.75rem", padding: "0.1875rem",
              overflowX: "auto",
            }}>
              {accounts.map((account) => {
                const meta = PROVIDER_META[account.provider];
                if (!meta) return null;
                const isActive = activeProvider === account.provider;
                const isLocked = account.provider !== "google_photos" && userPlan === "free" && (!isIOS() || IAP_ENABLED);
                return (
                  <button key={account.provider} onClick={() => {
                    if (isLocked) {
                      window.location.href = "/pricing";
                      return;
                    }
                    setActiveProvider(account.provider);
                  }} style={{
                    padding: "0.5rem 0.875rem", borderRadius: "0.75rem", border: "none",
                    background: isActive ? T.color.white : "transparent",
                    color: isActive ? "#403B36" /* Atrium ink */ : "#716A5E" /* Atrium muted */,
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isActive ? 600 : 500,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem",
                    whiteSpace: "nowrap", transition: "all 0.2s ease", minHeight: "2.75rem",
                    opacity: isLocked ? 0.7 : 1,
                  }}>
                    <span aria-hidden="true" style={{
                      flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                      background: T.color.cream, border: "0.0625rem solid #E3D6BC" /* Atrium hairline pill */,
                    }}><meta.Icon size={14} /></span>
                    {meta.name}
                    {isLocked && (
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: 700,
                        padding: "0.125rem 0.375rem", borderRadius: "0.25rem",
                        background: "rgba(154,79,42,0.11)", color: "#9A4F2A" /* Atrium terracotta — gold is reserved */,
                        textTransform: "uppercase", letterSpacing: "0.12em",
                      }}>Keeper</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 1.75rem 1.5rem" }}>

          {/* No accounts connected */}
          {!loadingAccounts && accounts.length === 0 && (
            <div style={{
              textAlign: "center", padding: "3rem 1.5rem",
            }}>
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}><LinkMark size={44} /></div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                color: "#403B36" /* Atrium ink */, margin: "0 0 0.5rem",
              }}>{t("noAccountsTitle")}</h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA,
                margin: "0 0 1.25rem", lineHeight: 1.5,
              }}>
                {t("noAccountsDesc")}
              </p>
              <a href="/settings/connections" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium ember */,
                color: "#FFF", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                textDecoration: "none", minHeight: "2.75rem",
              }}>
                {t("goToSettings")}
              </a>
            </div>
          )}

          {/* Loading accounts */}
          {loadingAccounts && (
            <div style={{
              textAlign: "center", padding: "3rem",
              fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA,
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
            }}>
              <div aria-hidden="true" style={{
                width: "2rem", height: "2rem", borderRadius: "50%",
                border: "0.1875rem solid #E3D6BC", /* Atrium hairline tone, opaque */
                borderTopColor: "#9A4F2A", /* Atrium glyph terracotta */
                animation: "cloudSpin .7s linear infinite",
              }} />
              {t("loadingAccounts")}
              <style>{`@keyframes cloudSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){[style*="cloudSpin"]{animation:none!important}}`}</style>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div role="alert" style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.75rem 1rem", borderRadius: "0.75rem",
              background: "#A63D3D10", border: "0.0625rem solid #A63D3D33",
              marginBottom: "0.75rem",
            }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A63D3D", flex: 1 }}>
                {error}
              </span>
              <button onClick={() => {
                setError(null);
                if (activeProvider) fetchItems(activeProvider);
                else {
                  setLoadingAccounts(true);
                  (async () => {
                    try {
                      const res = await fetch("/api/integrations/accounts");
                      if (res.ok) {
                        const data = await res.json();
                        const accs = filterAccountsForPlatform((data.accounts || []) as ConnectedAccount[]);
                        setAccounts(accs);
                        if (accs.length > 0) setActiveProvider(accs[0].provider);
                      }
                    } catch { setError(t("loadFailed")); }
                    setLoadingAccounts(false);
                  })();
                }
              }} style={{
                padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "0.0625rem solid #A63D3D33",
                background: "#A63D3D10", fontFamily: T.font.body, fontSize: "0.8125rem",
                fontWeight: 600, color: "#A63D3D", cursor: "pointer",
                minHeight: "2.75rem", flexShrink: 0,
              }}>{t("retry")}</button>
            </div>
          )}

          {/* Import complete view */}
          {importProgress && !importing && (
            <div aria-live="polite" style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                {importProgress.failed === 0 ? <CheckCircleMark size={48} /> : <WarningMark size={48} />}
              </div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, /* Atrium titleL */
                color: "#403B36" /* Atrium ink */, margin: "0 0 0.5rem",
              }}>
                {importProgress.failed === 0 ? t("completeSuccess") : t("completeWithErrors")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA, margin: "0 0 0.25rem",
              }}>
                {t("successCount", { succeeded: String(importProgress.succeeded), total: String(importProgress.total) })}
              </p>
              {importProgress.results.some((r) => !r.success) && (
                <div style={{ marginTop: "0.75rem", maxHeight: "9.375rem", overflowY: "auto" }}>
                  {importProgress.results.filter((r) => !r.success).map((r, i) => {
                    const skipped = isSkippedResult(r);
                    return (
                      <p key={i} style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem",
                        color: skipped ? "#56683C" /* Atrium sage — quiet, non-fatal */ : "#A63D3D",
                        margin: "0.25rem 0",
                      }}>
                        {skipped
                          ? t("importItemSkipped", { name: r.id === "error" ? t("importFailed") : (r.id.split("/").pop() || r.id) })
                          : t("importItemFailed", { name: r.id === "error" ? t("importFailed") : (r.id.split("/").pop() || r.id) })}
                        {r.error && <span style={{ display: "block", fontSize: "0.6875rem", color: "#716A5E" /* Atrium muted */ }}>{r.error}</span>}
                      </p>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", marginTop: "1.25rem" }}>
                <button onClick={() => {
                  setImportProgress(null);
                  setSelected(new Set());
                }} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                  color: "#403B36" /* Atrium ink */, cursor: "pointer", minHeight: "2.75rem",
                }}>{t("importMore")}</button>
                <button onClick={onClose} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none",
                  background: "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium ember */,
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                  color: "#FFF", cursor: "pointer", minHeight: "2.75rem",
                }}>{tc("close")}</button>
              </div>
            </div>
          )}

          {/* Importing progress (indeterminate — single batch request) */}
          {importing && importProgress && (
            <div style={{ padding: "2rem 0" }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED_AA, marginBottom: "0.5rem",
              }}>
                <span>{t("importingFrom", { provider: PROVIDER_META[activeProvider!]?.name })}</span>
                <span>{t("selected", { count: String(importProgress.total) })}</span>
              </div>
              <div role="progressbar" aria-label={t("importing")} aria-busy="true" style={{
                width: "100%", height: "0.5rem", borderRadius: "0.25rem",
                background: "#E3D6BC", /* Atrium hairline tone, opaque track */ overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  width: "40%",
                  height: "100%", borderRadius: "0.25rem",
                  background: "linear-gradient(90deg, #B85C38, #9A4F2A)", /* Atrium ember */
                  animation: "indeterminate 1.4s ease-in-out infinite",
                }} />
              </div>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED_AA,
                textAlign: "center", marginTop: "1rem",
              }}>
                {t("importWaitMessage")}
              </p>
              {/* Cancel: aborts the request so a stalled cloud import is
                  recoverable rather than hanging on the indeterminate bar. */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
                <button onClick={cancelImport} style={{
                  padding: "0.625rem 1.5rem", borderRadius: "0.75rem",
                  border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                  color: "#403B36" /* Atrium ink */, cursor: "pointer", minHeight: "2.75rem",
                }}>{t("cancel")}</button>
              </div>
              <style>{`@keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
@media (prefers-reduced-motion: reduce) { .indeterminate-bar, [style*="animation"] { animation: none !important; } [style*="transition"] { transition: none !important; } }`}</style>
            </div>
          )}

          {/* Keeper-only gate for non-Google providers. On iOS this shows only
              when IAP is live (IAP_ENABLED); /pricing then serves the IAP paywall. */}
          {activeProvider && activeProvider !== "google_photos" && userPlan === "free" && !importing && !importProgress && (!isIOS() || IAP_ENABLED) && (
            <div style={{
              textAlign: "center", padding: "2.5rem 1.5rem",
            }}>
              <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>{(() => { const I = PROVIDER_META[activeProvider!]?.Icon; return I ? <I size={40} /> : null; })()}</div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, /* Atrium titleM */
                color: "#403B36" /* Atrium ink */, margin: "0 0 0.5rem",
              }}>
                {tp("cloudImportKeeperOnly")}
              </h3>
              <a href="/pricing" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "0.75rem 1.5rem", borderRadius: "0.75rem", marginTop: "1rem",
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)", /* Atrium ember — gold never for buttons */
                color: "#FFF", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                textDecoration: "none", minHeight: "2.75rem",
              }}>
                Upgrade to Keeper
              </a>
            </div>
          )}

          {/* Browse view (only when not importing / not showing results) */}
          {activeProvider && !(activeProvider !== "google_photos" && userPlan === "free") && !importing && !importProgress && (
            <>
              {/* Folder breadcrumb (file-based services) */}
              {isFileProvider && folderPath.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.75rem",
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  flexWrap: "wrap",
                }}>
                  <button onClick={() => navigateBack(0)} style={{
                    background: "none", border: "none", color: "#9A4F2A" /* Atrium glyph terracotta */,
                    fontFamily: T.font.body, fontSize: "0.8125rem", cursor: "pointer",
                    padding: "0.125rem 0.25rem", minHeight: "2.75rem",
                  }}>
                    {t("root")}
                  </button>
                  {folderPath.map((folder, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ color: "#716A5E" /* Atrium muted */ }}>/</span>
                      <button onClick={() => navigateBack(i + 1)} style={{
                        background: "none", border: "none",
                        color: i === folderPath.length - 1 ? "#403B36" /* Atrium ink */ : "#9A4F2A" /* Atrium glyph terracotta */,
                        fontFamily: T.font.body, fontSize: "0.8125rem", cursor: "pointer",
                        fontWeight: i === folderPath.length - 1 ? 600 : 500,
                        padding: "0.125rem 0.25rem", minHeight: "2.75rem",
                      }}>
                        {folder.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Selection controls */}
              {items.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={selectAll} style={{
                      padding: "0.5rem 0.75rem", borderRadius: "0.75rem",
                      border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.white,
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: "#403B36" /* Atrium ink */,
                      cursor: "pointer", minHeight: "2.75rem",
                    }}>{t("selectAll")}</button>
                    <button onClick={selectNone} style={{
                      padding: "0.5rem 0.75rem", borderRadius: "0.75rem",
                      border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.white,
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: "#403B36" /* Atrium ink */,
                      cursor: "pointer", minHeight: "2.75rem",
                    }}>{t("selectNone")}</button>
                  </div>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED_AA,
                  }}>
                    {t("selected", { count: String(selected.size) })}
                    {selectedSize > 0 && ` (${formatBytes(selectedSize)})`}
                  </span>
                </div>
              )}

              {/* Items grid */}
              {loadingItems && items.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "3rem",
                  fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                }}>
                  <div aria-hidden="true" style={{
                    width: "2rem", height: "2rem", borderRadius: "50%",
                    border: "0.1875rem solid #E3D6BC", /* Atrium hairline tone, opaque */
                    borderTopColor: "#9A4F2A", /* Atrium glyph terracotta */
                    animation: "cloudSpin .7s linear infinite",
                  }} />
                  {t("loadingFiles")}
                  <style>{`@keyframes cloudSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){[style*="cloudSpin"]{animation:none!important}}`}</style>
                </div>
              ) : items.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "3rem",
                  fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA,
                }}>
                  {t("noFiles")}
                </div>
              ) : (
                <>
                  {/* Grid for photo services, list for file services */}
                  {activeProvider === "google_photos" ? (
                    <PhotoGrid
                      items={items}
                      selected={selected}
                      onToggle={toggleSelect}
                    />
                  ) : (
                    <FileList
                      items={items}
                      selected={selected}
                      onToggle={toggleSelect}
                      onOpenFolder={openFolder}
                    />
                  )}

                  {/* Load more */}
                  {nextCursor && (
                    <button
                      onClick={() => fetchItems(activeProvider, nextCursor,
                        folderPath.length > 0 ? folderPath[folderPath.length - 1].id : undefined
                      )}
                      disabled={loadingItems}
                      style={{
                        width: "100%", padding: "0.75rem", borderRadius: "0.75rem", marginTop: "0.75rem",
                        border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: T.color.white,
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36" /* Atrium ink */,
                        cursor: "pointer", minHeight: "2.75rem",
                      }}
                    >
                      {loadingItems ? tc("loading") : t("loadMore")}
                    </button>
                  )}
                </>
              )}

              {/* Target room selection + import button */}
              {selected.size > 0 && (
                <div style={{
                  marginTop: "1rem", paddingTop: "1rem",
                  borderTop: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
                }}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem",
                  }}>
                    <div>
                      <label style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E" /* Atrium muted */,
                        textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, /* Atrium overline voice */
                        display: "block", marginBottom: "0.375rem",
                      }}>{t("targetWing")}</label>
                      <select
                        value={targetWingId}
                        onChange={(e) => { setTargetWingId(e.target.value); setTargetRoomId(""); }}
                        disabled={importing}
                        style={{
                          width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.75rem",
                          border: "0.0625rem solid #E3D6BC" /* Atrium hairline */, background: importing ? T.color.warmStone : T.color.white,
                          fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: "#403B36" /* Atrium ink */,
                          cursor: importing ? "not-allowed" : "pointer",
                          opacity: importing ? 0.6 : 1,
                        }}
                      >
                        <option value="">{t("selectWing")}</option>
                        {wings.map((w) => (
                          <option key={w.id} value={w.id}>{w.icon} {tWings(w.nameKey) || w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E" /* Atrium muted */,
                        textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, /* Atrium overline voice */
                        display: "block", marginBottom: "0.375rem",
                      }}>{t("targetRoom")}</label>
                      <select
                        value={targetRoomId}
                        onChange={(e) => setTargetRoomId(e.target.value)}
                        disabled={!targetWingId || importing}
                        style={{
                          width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.75rem",
                          border: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
                          background: (!targetWingId || importing) ? T.color.warmStone : T.color.white,
                          fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: "#403B36" /* Atrium ink */,
                          cursor: (targetWingId && !importing) ? "pointer" : importing ? "not-allowed" : "default",
                          opacity: importing ? 0.6 : 1,
                        }}
                      >
                        <option value="">{t("selectRoom")}</option>
                        {targetWingId && getWingRooms(targetWingId).map((r) => (
                          <option key={r.id} value={r.id}>{r.icon} {(r.nameKey && tWings(r.nameKey)) || r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleImport}
                    disabled={!targetRoomId || importing}
                    style={{
                      width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: "none",
                      background: !targetRoomId
                        ? "#E5DDD0" /* opaque warmStone */
                        : "linear-gradient(135deg, #B85C38, #9A4F2A)" /* Atrium ember */,
                      color: !targetRoomId ? "#716A5E" /* Atrium muted */ : "#FFF",
                      fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                      cursor: !targetRoomId ? "default" : "pointer",
                    }}
                  >
                    {selected.size !== 1 ? t("importFiles", { count: String(selected.size) }) : t("importFile")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
    </>
  );

  // In embedded mode, just render the content directly (no overlay)
  if (embedded) {
    return (
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {content}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
          @media (prefers-reduced-motion: reduce) { .indeterminate-bar, [style*="animation"] { animation: none !important; } [style*="transition"] { transition: none !important; } }
          select:focus-visible, button:focus-visible, [role="button"]:focus-visible, a:focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: 0.1875rem; }
        `}</style>
      </div>
    );
  }

  // Standalone modal mode
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0,
      background: "rgba(64,59,54,0.55)", backdropFilter: "blur(10px)",
      zIndex: 60, animation: "fadeIn .2s ease",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleTrapKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        width: "min(56.25rem, 94vw)", maxHeight: "90vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderRadius: "1rem", border: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium S2 */
        animation: "fadeUp .3s ease",
      }}>
        {content}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .indeterminate-bar, [style*="animation"] { animation: none !important; } [style*="transition"] { transition: none !important; } }
        select:focus-visible, button:focus-visible, [role="button"]:focus-visible, a:focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: 0.1875rem; }
      `}</style>
    </div>
  );
}

// ═══ Photo Grid (for Google Photos) ═══
function PhotoGrid({ items, selected, onToggle }: {
  items: CloudItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation("import");
  const { t: tc } = useTranslation("common");
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))",
      gap: "0.5rem",
      maxHeight: "25rem",
      overflowY: "auto",
      borderRadius: "0.75rem",
    }}>
      {items.map((item) => {
        const isSelected = selected.has(item.id);
        return (
          <div key={item.id} role="button" tabIndex={0} onClick={() => onToggle(item.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(item.id); } }} aria-label={`${isSelected ? tc("deselect") : tc("select")} ${item.filename || item.name}`} style={{
            position: "relative", aspectRatio: "1",
            borderRadius: "0.75rem", overflow: "hidden", cursor: "pointer",
            border: isSelected ? "0.1875rem solid #B85C38" /* Atrium ember */ : "0.0625rem solid #E3D6BC" /* Atrium hairline */,
            background: T.color.warmStone,
            transition: "border 0.2s ease",
          }}>
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.filename || item.name || ""}
                fill sizes="(max-width: 768px) 33vw, 150px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.75rem", color: "#716A5E" /* Atrium muted */,
              }}>
                {item.isVideo ? <VideoMark size={28} color="#716A5E" /> : <ImageMark size={28} color="#716A5E" />}
              </div>
            )}

            {/* Selection checkbox */}
            <div style={{
              position: "absolute", top: "0.375rem", right: "0.375rem",
              width: "1.5rem", height: "1.5rem", borderRadius: "0.75rem",
              background: isSelected ? "#B85C38" /* Atrium ember */ : "rgba(255,255,255,.8)",
              border: isSelected ? "none" : "0.125rem solid #D6CCBA",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", color: "#FFF", fontWeight: 700,
              transition: "all 0.2s ease",
              boxShadow: "0 0.0625rem 0.25rem rgba(64,59,54,0.15)",
            }}>
              {isSelected && "\u2713"}
            </div>

            {/* Video badge */}
            {item.isVideo && (
              <div style={{
                position: "absolute", bottom: "0.375rem", left: "0.375rem",
                padding: "0.125rem 0.375rem", borderRadius: "0.25rem",
                background: "rgba(64,59,54,0.7)", color: "#FFF", /* warm ink */
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
              }}>
                {t("video")}
              </div>
            )}

            {/* Filename on hover area */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "1rem 0.375rem 0.25rem",
              background: "linear-gradient(transparent, rgba(64,59,54,0.55))", /* warm ink scrim */
              pointerEvents: "none",
            }}>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", color: "#FFF",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                display: "block",
              }}>
                {item.filename || item.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ File List (for Dropbox, OneDrive, Box) ═══
function FileList({ items, selected, onToggle, onOpenFolder }: {
  items: CloudItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpenFolder: (item: CloudItem) => void;
}) {
  const { t, locale } = useTranslation("import");
  const { t: tc } = useTranslation("common");
  // Sort: folders first, then files
  const sorted = [...items].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div style={{
      maxHeight: "25rem", overflowY: "auto",
      borderRadius: "0.75rem", border: "0.0625rem solid #E3D6BC" /* Atrium hairline */,
      background: T.color.white,
    }}>
      {sorted.map((item) => {
        const isFolder = item.isFolder;
        const isSelected = selected.has(item.id);
        const icon = isFolder
          ? <FolderMark size={20} />
          : item.isImage || item.isMedia
          ? <ImageMark size={20} />
          : item.isVideo
          ? <VideoMark size={20} />
          : <FileMark size={20} />;

        return (
          <div key={item.id} role="button" tabIndex={0} aria-label={isFolder ? `${tc("openFolder")} ${item.name}` : `${isSelected ? tc("deselect") : tc("select")} ${item.name}`} style={{
            display: "flex", alignItems: "center", gap: "0.625rem",
            padding: "0.625rem 0.875rem", minHeight: "2.75rem",
            borderBottom: "0.0625rem solid #E3D6BC" /* Atrium hairline, opaque */,
            background: isSelected ? "#F6EBE3" /* Atrium terracotta tray, pre-mixed opaque */ : "transparent",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
            onClick={() => isFolder ? onOpenFolder(item) : onToggle(item.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); isFolder ? onOpenFolder(item) : onToggle(item.id); } }}
          >
            {/* Checkbox (files only) */}
            {!isFolder ? (
              <div style={{
                width: "1.25rem", height: "1.25rem", borderRadius: "0.25rem", flexShrink: 0,
                border: isSelected ? "0.125rem solid #B85C38" : "0.125rem solid #D6CCBA",
                background: isSelected ? "#B85C38" /* Atrium ember */ : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6875rem", color: "#FFF", transition: "all 0.2s ease",
              }}>
                {isSelected && "\u2713"}
              </div>
            ) : (
              <div style={{ width: "1.25rem", flexShrink: 0 }} />
            )}

            {/* Thumbnail / icon */}
            <div style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem", flexShrink: 0, overflow: "hidden",
              background: T.color.warmStone,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.125rem", position: "relative",
            }}>
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt="" fill sizes="36px"
                  style={{ objectFit: "cover" }} />
              ) : (
                icon
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isFolder ? 500 : 500,
                color: "#403B36" /* Atrium ink */,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {item.name}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E" /* Atrium muted */,
                display: "flex", gap: "0.5rem",
              }}>
                {isFolder && item.childCount != null && (
                  <span>{t("items", { count: String(item.childCount) })}</span>
                )}
                {!isFolder && item.size != null && item.size > 0 && (
                  <span>{formatBytes(item.size)}</span>
                )}
                {item.modified && (
                  <span>{new Date(item.modified).toLocaleDateString(locale)}</span>
                )}
              </div>
            </div>

            {/* Folder arrow */}
            {isFolder && (
              <span style={{
                color: "#716A5E" /* Atrium muted */, fontSize: "0.9375rem", flexShrink: 0,
              }}>{"\u203A"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
