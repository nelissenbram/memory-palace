"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

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
  memoryId?: string;
}

interface Props {
  onClose: () => void;
  embedded?: boolean;
}

// ── Provider metadata ──
const PROVIDER_META: Record<string, { name: string; icon: string; accent: string }> = {
  google_photos: { name: "Google Photos", icon: "\u{1F4F8}", accent: "#4285F4" },
  dropbox: { name: "Dropbox", icon: "\u{1F4E6}", accent: "#0061FF" },
  onedrive: { name: "OneDrive", icon: "\u2601\uFE0F", accent: "#0078D4" },
  box: { name: "Box", icon: "\u{1F4C1}", accent: "#0061D5" },
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

// ═══ Main CloudImportPanel ═══
export default function CloudImportPanel({ onClose, embedded }: Props) {
  const { t } = useTranslation("import");
  const { t: tc } = useTranslation("common");
  const { getWings, getWingRooms } = useRoomStore();
  const wings = getWings();

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

  // Target room
  const [targetWingId, setTargetWingId] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");

  // Fetch connected accounts
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrations/accounts");
        if (res.ok) {
          const data = await res.json();
          const accs = (data.accounts || []) as ConnectedAccount[];
          setAccounts(accs);
          // Auto-select first connected account
          if (accs.length > 0) {
            setActiveProvider(accs[0].provider);
          }
        }
      } catch { /* ignore */ }
      setLoadingAccounts(false);
    })();
  }, []);

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
      }
    } catch { /* ignore */ }
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    if (activeProvider) {
      setItems([]);
      setSelected(new Set());
      setFolderPath([]);
      setNextCursor(null);
      setImportProgress(null);
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
      });

      if (res.ok) {
        const data = await res.json();
        setImportProgress({
          total: data.summary.total,
          succeeded: data.summary.succeeded,
          failed: data.summary.failed,
          results: data.results,
        });
      } else {
        const err = await res.json();
        setImportProgress((prev) => prev ? {
          ...prev,
          failed: prev.total,
          results: [{ id: "error", success: false, error: err.error || t("importFailed") }],
        } : null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("importFailed");
      setImportProgress((prev) => prev ? {
        ...prev,
        failed: prev.total,
        results: [{ id: "error", success: false, error: message }],
      } : null);
    }

    setImporting(false);
  };

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
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem",
              }}>{"\u2601\uFE0F"}</div>
              <div>
                <h3 style={{
                  fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                  color: T.color.charcoal, margin: 0,
                }}>{t("title")}</h3>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.125rem 0 0",
                }}>
                  {importing
                    ? t("importing")
                    : importProgress
                    ? t("successCount", { succeeded: String(importProgress.succeeded), total: String(importProgress.total) })
                    : t("browseDescription")}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: "2rem", height: "2rem", borderRadius: "1rem",
              border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
              color: T.color.muted, fontSize: "0.875rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{"\u2715"}</button>
          </div>

          {/* Provider tabs */}
          {!loadingAccounts && accounts.length > 0 && (
            <div style={{
              display: "flex", gap: "0.25rem", marginBottom: "1rem",
              background: T.color.warmStone, borderRadius: "0.625rem", padding: "0.1875rem",
              overflowX: "auto",
            }}>
              {accounts.map((account) => {
                const meta = PROVIDER_META[account.provider];
                if (!meta) return null;
                const isActive = activeProvider === account.provider;
                return (
                  <button key={account.provider} onClick={() => setActiveProvider(account.provider)} style={{
                    padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: "none",
                    background: isActive ? T.color.white : "transparent",
                    color: isActive ? T.color.charcoal : T.color.muted,
                    fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: isActive ? 600 : 400,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem",
                    whiteSpace: "nowrap", transition: "all .15s",
                  }}>
                    <span>{meta.icon}</span>
                    {meta.name}
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
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{"\u{1F517}"}</div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500,
                color: T.color.charcoal, margin: "0 0 0.5rem",
              }}>{t("noAccountsTitle")}</h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                margin: "0 0 1.25rem", lineHeight: 1.5,
              }}>
                {t("noAccountsDesc")}
              </p>
              <a href="/settings/connections" style={{
                display: "inline-block", padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                textDecoration: "none",
              }}>
                {t("goToSettings")}
              </a>
            </div>
          )}

          {/* Loading accounts */}
          {loadingAccounts && (
            <div style={{
              textAlign: "center", padding: "3rem",
              fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
            }}>
              {t("loadingAccounts")}
            </div>
          )}

          {/* Import complete view */}
          {importProgress && !importing && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                {importProgress.failed === 0 ? "\u{1F389}" : "\u26A0\uFE0F"}
              </div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600,
                color: T.color.charcoal, margin: "0 0 0.5rem",
              }}>
                {importProgress.failed === 0 ? t("completeSuccess") : t("completeWithErrors")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, margin: "0 0 0.25rem",
              }}>
                {t("successCount", { succeeded: String(importProgress.succeeded), total: String(importProgress.total) })}
              </p>
              {importProgress.failed > 0 && (
                <div style={{ marginTop: "0.75rem", maxHeight: "9.375rem", overflowY: "auto" }}>
                  {importProgress.results.filter((r) => !r.success).map((r, i) => (
                    <p key={i} style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C05050", margin: "0.25rem 0",
                    }}>
                      {r.id}: {r.error}
                    </p>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", marginTop: "1.25rem" }}>
                <button onClick={() => {
                  setImportProgress(null);
                  setSelected(new Set());
                }} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                  color: T.color.charcoal, cursor: "pointer",
                }}>{t("importMore")}</button>
                <button onClick={onClose} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                  color: "#FFF", cursor: "pointer",
                }}>{tc("close")}</button>
              </div>
            </div>
          )}

          {/* Importing progress */}
          {importing && importProgress && (
            <div style={{ padding: "2rem 0" }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginBottom: "0.5rem",
              }}>
                <span>{t("importingFrom", { provider: PROVIDER_META[activeProvider!]?.name })}</span>
                <span>{importProgress.succeeded + importProgress.failed} / {importProgress.total}</span>
              </div>
              <div style={{
                width: "100%", height: "0.5rem", borderRadius: "0.25rem",
                background: `${T.color.sandstone}33`, overflow: "hidden",
              }}>
                <div style={{
                  width: `${importProgress.total > 0
                    ? ((importProgress.succeeded + importProgress.failed) / importProgress.total) * 100
                    : 0}%`,
                  height: "100%", borderRadius: "0.25rem",
                  background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  transition: "width .3s",
                }} />
              </div>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                textAlign: "center", marginTop: "1rem",
              }}>
                {t("importWaitMessage")}
              </p>
            </div>
          )}

          {/* Browse view (only when not importing / not showing results) */}
          {activeProvider && !importing && !importProgress && (
            <>
              {/* Folder breadcrumb (file-based services) */}
              {isFileProvider && folderPath.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.75rem",
                  fontFamily: T.font.body, fontSize: "0.75rem",
                  flexWrap: "wrap",
                }}>
                  <button onClick={() => navigateBack(0)} style={{
                    background: "none", border: "none", color: T.color.terracotta,
                    fontFamily: T.font.body, fontSize: "0.75rem", cursor: "pointer",
                    padding: "0.125rem 0.25rem",
                  }}>
                    {t("root")}
                  </button>
                  {folderPath.map((folder, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ color: T.color.muted }}>/</span>
                      <button onClick={() => navigateBack(i + 1)} style={{
                        background: "none", border: "none",
                        color: i === folderPath.length - 1 ? T.color.charcoal : T.color.terracotta,
                        fontFamily: T.font.body, fontSize: "0.75rem", cursor: "pointer",
                        fontWeight: i === folderPath.length - 1 ? 600 : 400,
                        padding: "0.125rem 0.25rem",
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
                      padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                      border: `1px solid ${T.color.cream}`, background: T.color.white,
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal,
                      cursor: "pointer",
                    }}>{t("selectAll")}</button>
                    <button onClick={selectNone} style={{
                      padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                      border: `1px solid ${T.color.cream}`, background: T.color.white,
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal,
                      cursor: "pointer",
                    }}>{t("selectNone")}</button>
                  </div>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
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
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
                }}>
                  {t("loadingFiles")}
                </div>
              ) : items.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "3rem",
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
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
                        width: "100%", padding: "0.75rem", borderRadius: "0.625rem", marginTop: "0.75rem",
                        border: `1px solid ${T.color.cream}`, background: T.color.white,
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                        cursor: "pointer",
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
                  borderTop: `1px solid ${T.color.cream}`,
                }}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem",
                  }}>
                    <div>
                      <label style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                        textTransform: "uppercase", letterSpacing: ".5px",
                        display: "block", marginBottom: "0.375rem",
                      }}>{t("targetWing")}</label>
                      <select
                        value={targetWingId}
                        onChange={(e) => { setTargetWingId(e.target.value); setTargetRoomId(""); }}
                        style={{
                          width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
                          border: `1px solid ${T.color.cream}`, background: T.color.white,
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                          cursor: "pointer", outline: "none",
                        }}
                      >
                        <option value="">{t("selectWing")}</option>
                        {wings.map((w) => (
                          <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                        textTransform: "uppercase", letterSpacing: ".5px",
                        display: "block", marginBottom: "0.375rem",
                      }}>{t("targetRoom")}</label>
                      <select
                        value={targetRoomId}
                        onChange={(e) => setTargetRoomId(e.target.value)}
                        disabled={!targetWingId}
                        style={{
                          width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
                          border: `1px solid ${T.color.cream}`,
                          background: !targetWingId ? T.color.warmStone : T.color.white,
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                          cursor: targetWingId ? "pointer" : "default", outline: "none",
                        }}
                      >
                        <option value="">{t("selectRoom")}</option>
                        {targetWingId && getWingRooms(targetWingId).map((r) => (
                          <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
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
                        ? `${T.color.sandstone}40`
                        : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                      color: !targetRoomId ? T.color.muted : "#FFF",
                      fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
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
          @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  // Standalone modal mode
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0,
      background: "rgba(42,34,24,.5)", backdropFilter: "blur(10px)",
      zIndex: 60, animation: "fadeIn .2s ease",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(900px, 94vw)", maxHeight: "90vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderRadius: "1.25rem", border: `1px solid ${T.color.cream}`,
        boxShadow: "0 24px 80px rgba(44,44,42,.3)",
        animation: "fadeUp .3s ease",
      }}>
        {content}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
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
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: "0.5rem",
      maxHeight: "25rem",
      overflowY: "auto",
      borderRadius: "0.75rem",
    }}>
      {items.map((item) => {
        const isSelected = selected.has(item.id);
        return (
          <div key={item.id} role="button" tabIndex={0} onClick={() => onToggle(item.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(item.id); } }} aria-label={`${isSelected ? "Deselect" : "Select"} ${item.filename || item.name}`} style={{
            position: "relative", aspectRatio: "1",
            borderRadius: "0.625rem", overflow: "hidden", cursor: "pointer",
            border: isSelected ? `3px solid ${T.color.terracotta}` : `1px solid ${T.color.cream}`,
            background: T.color.warmStone,
            transition: "border .15s",
          }}>
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.filename || item.name || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.75rem", color: T.color.muted,
              }}>
                {item.isVideo ? "\u{1F3AC}" : "\u{1F5BC}\uFE0F"}
              </div>
            )}

            {/* Selection checkbox */}
            <div style={{
              position: "absolute", top: "0.375rem", right: "0.375rem",
              width: "1.5rem", height: "1.5rem", borderRadius: "0.75rem",
              background: isSelected ? T.color.terracotta : "rgba(255,255,255,.8)",
              border: isSelected ? "none" : `2px solid ${T.color.sandstone}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", color: "#FFF", fontWeight: 700,
              transition: "all .15s",
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
            }}>
              {isSelected && "\u2713"}
            </div>

            {/* Video badge */}
            {item.isVideo && (
              <div style={{
                position: "absolute", bottom: "0.375rem", left: "0.375rem",
                padding: "0.125rem 0.375rem", borderRadius: "0.25rem",
                background: "rgba(0,0,0,.6)", color: "#FFF",
                fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
              }}>
                {t("video")}
              </div>
            )}

            {/* Filename on hover area */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "1rem 0.375rem 0.25rem",
              background: "linear-gradient(transparent, rgba(0,0,0,.5))",
              pointerEvents: "none",
            }}>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.5625rem", color: "#FFF",
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
  // Sort: folders first, then files
  const sorted = [...items].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div style={{
      maxHeight: 400, overflowY: "auto",
      borderRadius: 12, border: `1px solid ${T.color.cream}`,
      background: T.color.white,
    }}>
      {sorted.map((item) => {
        const isFolder = item.isFolder;
        const isSelected = selected.has(item.id);
        const icon = isFolder
          ? "\u{1F4C1}"
          : item.isImage || item.isMedia
          ? "\u{1F5BC}\uFE0F"
          : item.isVideo
          ? "\u{1F3AC}"
          : "\u{1F4C4}";

        return (
          <div key={item.id} role="button" tabIndex={0} aria-label={isFolder ? `Open folder ${item.name}` : `${isSelected ? "Deselect" : "Select"} ${item.name}`} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            borderBottom: `1px solid ${T.color.cream}22`,
            background: isSelected ? `${T.color.terracotta}06` : "transparent",
            cursor: "pointer",
            transition: "background .1s",
          }}
            onClick={() => isFolder ? onOpenFolder(item) : onToggle(item.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); isFolder ? onOpenFolder(item) : onToggle(item.id); } }}
          >
            {/* Checkbox (files only) */}
            {!isFolder ? (
              <div style={{
                width: "1.25rem", height: "1.25rem", borderRadius: "0.25rem", flexShrink: 0,
                border: isSelected ? `2px solid ${T.color.terracotta}` : `2px solid ${T.color.sandstone}`,
                background: isSelected ? T.color.terracotta : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6875rem", color: "#FFF", transition: "all .15s",
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
              fontSize: "1.125rem",
            }}>
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" style={{
                  width: "100%", height: "100%", objectFit: "cover",
                }} loading="lazy" />
              ) : (
                icon
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isFolder ? 500 : 400,
                color: T.color.charcoal,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {item.name}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
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
                color: T.color.muted, fontSize: "0.875rem", flexShrink: 0,
              }}>{"\u203A"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
