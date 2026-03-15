"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useRoomStore } from "@/lib/stores/roomStore";

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
          results: [{ id: "error", success: false, error: err.error || "Import failed" }],
        } : null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
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
        <div style={{ padding: "24px 28px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>{"\u2601\uFE0F"}</div>
              <div>
                <h3 style={{
                  fontFamily: T.font.display, fontSize: 22, fontWeight: 600,
                  color: T.color.charcoal, margin: 0,
                }}>Import from Cloud</h3>
                <p style={{
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: "2px 0 0",
                }}>
                  {importing
                    ? "Importing your memories..."
                    : importProgress
                    ? `Import complete: ${importProgress.succeeded} succeeded, ${importProgress.failed} failed`
                    : "Browse and select files from your connected accounts"}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 16,
              border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
              color: T.color.muted, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{"\u2715"}</button>
          </div>

          {/* Provider tabs */}
          {!loadingAccounts && accounts.length > 0 && (
            <div style={{
              display: "flex", gap: 4, marginBottom: 16,
              background: T.color.warmStone, borderRadius: 10, padding: 3,
              overflowX: "auto",
            }}>
              {accounts.map((account) => {
                const meta = PROVIDER_META[account.provider];
                if (!meta) return null;
                const isActive = activeProvider === account.provider;
                return (
                  <button key={account.provider} onClick={() => setActiveProvider(account.provider)} style={{
                    padding: "8px 14px", borderRadius: 8, border: "none",
                    background: isActive ? T.color.white : "transparent",
                    color: isActive ? T.color.charcoal : T.color.muted,
                    fontFamily: T.font.body, fontSize: 12, fontWeight: isActive ? 600 : 400,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
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
        <div style={{ flex: 1, overflow: "auto", padding: "0 28px 24px" }}>

          {/* No accounts connected */}
          {!loadingAccounts && accounts.length === 0 && (
            <div style={{
              textAlign: "center", padding: "48px 24px",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u{1F517}"}</div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
                color: T.color.charcoal, margin: "0 0 8px",
              }}>No Accounts Connected</h3>
              <p style={{
                fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                margin: "0 0 20px", lineHeight: 1.5,
              }}>
                Connect your cloud storage or photo services to import memories.
              </p>
              <a href="/settings/connections" style={{
                display: "inline-block", padding: "12px 24px", borderRadius: 12,
                background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                textDecoration: "none",
              }}>
                Go to Settings
              </a>
            </div>
          )}

          {/* Loading accounts */}
          {loadingAccounts && (
            <div style={{
              textAlign: "center", padding: 48,
              fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
            }}>
              Loading your accounts...
            </div>
          )}

          {/* Import complete view */}
          {importProgress && !importing && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {importProgress.failed === 0 ? "\u{1F389}" : "\u26A0\uFE0F"}
              </div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: 24, fontWeight: 600,
                color: T.color.charcoal, margin: "0 0 8px",
              }}>
                {importProgress.failed === 0 ? "Import Complete!" : "Import Finished with Errors"}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: 14, color: T.color.muted, margin: "0 0 4px",
              }}>
                {importProgress.succeeded} of {importProgress.total} files imported successfully
              </p>
              {importProgress.failed > 0 && (
                <div style={{ marginTop: 12, maxHeight: 150, overflowY: "auto" }}>
                  {importProgress.results.filter((r) => !r.success).map((r, i) => (
                    <p key={i} style={{
                      fontFamily: T.font.body, fontSize: 11, color: "#C05050", margin: "4px 0",
                    }}>
                      {r.id}: {r.error}
                    </p>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                <button onClick={() => {
                  setImportProgress(null);
                  setSelected(new Set());
                }} style={{
                  padding: "12px 24px", borderRadius: 12,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 13, fontWeight: 500,
                  color: T.color.charcoal, cursor: "pointer",
                }}>Import More</button>
                <button onClick={onClose} style={{
                  padding: "12px 24px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  fontFamily: T.font.body, fontSize: 13, fontWeight: 600,
                  color: "#FFF", cursor: "pointer",
                }}>Close</button>
              </div>
            </div>
          )}

          {/* Importing progress */}
          {importing && importProgress && (
            <div style={{ padding: "32px 0" }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: T.font.body, fontSize: 12, color: T.color.muted, marginBottom: 8,
              }}>
                <span>Importing files from {PROVIDER_META[activeProvider!]?.name}...</span>
                <span>{importProgress.succeeded + importProgress.failed} / {importProgress.total}</span>
              </div>
              <div style={{
                width: "100%", height: 8, borderRadius: 4,
                background: `${T.color.sandstone}33`, overflow: "hidden",
              }}>
                <div style={{
                  width: `${importProgress.total > 0
                    ? ((importProgress.succeeded + importProgress.failed) / importProgress.total) * 100
                    : 0}%`,
                  height: "100%", borderRadius: 4,
                  background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  transition: "width .3s",
                }} />
              </div>
              <p style={{
                fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                textAlign: "center", marginTop: 16,
              }}>
                Please wait while we download and import your selected files.
                This may take a moment depending on the file sizes.
              </p>
            </div>
          )}

          {/* Browse view (only when not importing / not showing results) */}
          {activeProvider && !importing && !importProgress && (
            <>
              {/* Folder breadcrumb (file-based services) */}
              {isFileProvider && folderPath.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4, marginBottom: 12,
                  fontFamily: T.font.body, fontSize: 12,
                  flexWrap: "wrap",
                }}>
                  <button onClick={() => navigateBack(0)} style={{
                    background: "none", border: "none", color: T.color.terracotta,
                    fontFamily: T.font.body, fontSize: 12, cursor: "pointer",
                    padding: "2px 4px",
                  }}>
                    Root
                  </button>
                  {folderPath.map((folder, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: T.color.muted }}>/</span>
                      <button onClick={() => navigateBack(i + 1)} style={{
                        background: "none", border: "none",
                        color: i === folderPath.length - 1 ? T.color.charcoal : T.color.terracotta,
                        fontFamily: T.font.body, fontSize: 12, cursor: "pointer",
                        fontWeight: i === folderPath.length - 1 ? 600 : 400,
                        padding: "2px 4px",
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
                  marginBottom: 12,
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={selectAll} style={{
                      padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${T.color.cream}`, background: T.color.white,
                      fontFamily: T.font.body, fontSize: 11, color: T.color.charcoal,
                      cursor: "pointer",
                    }}>Select All</button>
                    <button onClick={selectNone} style={{
                      padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${T.color.cream}`, background: T.color.white,
                      fontFamily: T.font.body, fontSize: 11, color: T.color.charcoal,
                      cursor: "pointer",
                    }}>Select None</button>
                  </div>
                  <span style={{
                    fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                  }}>
                    {selected.size} selected
                    {selectedSize > 0 && ` (${formatBytes(selectedSize)})`}
                  </span>
                </div>
              )}

              {/* Items grid */}
              {loadingItems && items.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: 48,
                  fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                }}>
                  Loading files...
                </div>
              ) : items.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: 48,
                  fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
                }}>
                  No files found in this location.
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
                        width: "100%", padding: 12, borderRadius: 10, marginTop: 12,
                        border: `1px solid ${T.color.cream}`, background: T.color.white,
                        fontFamily: T.font.body, fontSize: 13, color: T.color.charcoal,
                        cursor: "pointer",
                      }}
                    >
                      {loadingItems ? "Loading..." : "Load More"}
                    </button>
                  )}
                </>
              )}

              {/* Target room selection + import button */}
              {selected.size > 0 && (
                <div style={{
                  marginTop: 16, paddingTop: 16,
                  borderTop: `1px solid ${T.color.cream}`,
                }}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12,
                  }}>
                    <div>
                      <label style={{
                        fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                        textTransform: "uppercase", letterSpacing: ".5px",
                        display: "block", marginBottom: 6,
                      }}>Target Wing</label>
                      <select
                        value={targetWingId}
                        onChange={(e) => { setTargetWingId(e.target.value); setTargetRoomId(""); }}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          border: `1px solid ${T.color.cream}`, background: T.color.white,
                          fontFamily: T.font.body, fontSize: 13, color: T.color.charcoal,
                          cursor: "pointer", outline: "none",
                        }}
                      >
                        <option value="">-- Select wing --</option>
                        {wings.map((w) => (
                          <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{
                        fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
                        textTransform: "uppercase", letterSpacing: ".5px",
                        display: "block", marginBottom: 6,
                      }}>Target Room</label>
                      <select
                        value={targetRoomId}
                        onChange={(e) => setTargetRoomId(e.target.value)}
                        disabled={!targetWingId}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          border: `1px solid ${T.color.cream}`,
                          background: !targetWingId ? T.color.warmStone : T.color.white,
                          fontFamily: T.font.body, fontSize: 13, color: T.color.charcoal,
                          cursor: targetWingId ? "pointer" : "default", outline: "none",
                        }}
                      >
                        <option value="">-- Select room --</option>
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
                      width: "100%", padding: 14, borderRadius: 12, border: "none",
                      background: !targetRoomId
                        ? `${T.color.sandstone}40`
                        : `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                      color: !targetRoomId ? T.color.muted : "#FFF",
                      fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                      cursor: !targetRoomId ? "default" : "pointer",
                    }}
                  >
                    Import {selected.size} file{selected.size !== 1 ? "s" : ""} to Memory Palace
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
        borderRadius: 20, border: `1px solid ${T.color.cream}`,
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
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: 8,
      maxHeight: 400,
      overflowY: "auto",
      borderRadius: 12,
    }}>
      {items.map((item) => {
        const isSelected = selected.has(item.id);
        return (
          <div key={item.id} onClick={() => onToggle(item.id)} style={{
            position: "relative", aspectRatio: "1",
            borderRadius: 10, overflow: "hidden", cursor: "pointer",
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
                fontSize: 28, color: T.color.muted,
              }}>
                {item.isVideo ? "\u{1F3AC}" : "\u{1F5BC}\uFE0F"}
              </div>
            )}

            {/* Selection checkbox */}
            <div style={{
              position: "absolute", top: 6, right: 6,
              width: 24, height: 24, borderRadius: 12,
              background: isSelected ? T.color.terracotta : "rgba(255,255,255,.8)",
              border: isSelected ? "none" : `2px solid ${T.color.sandstone}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#FFF", fontWeight: 700,
              transition: "all .15s",
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
            }}>
              {isSelected && "\u2713"}
            </div>

            {/* Video badge */}
            {item.isVideo && (
              <div style={{
                position: "absolute", bottom: 6, left: 6,
                padding: "2px 6px", borderRadius: 4,
                background: "rgba(0,0,0,.6)", color: "#FFF",
                fontFamily: T.font.body, fontSize: 9, fontWeight: 600,
              }}>
                VIDEO
              </div>
            )}

            {/* Filename on hover area */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "16px 6px 4px",
              background: "linear-gradient(transparent, rgba(0,0,0,.5))",
              pointerEvents: "none",
            }}>
              <span style={{
                fontFamily: T.font.body, fontSize: 9, color: "#FFF",
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
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            borderBottom: `1px solid ${T.color.cream}22`,
            background: isSelected ? `${T.color.terracotta}06` : "transparent",
            cursor: "pointer",
            transition: "background .1s",
          }}
            onClick={() => isFolder ? onOpenFolder(item) : onToggle(item.id)}
          >
            {/* Checkbox (files only) */}
            {!isFolder ? (
              <div style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: isSelected ? `2px solid ${T.color.terracotta}` : `2px solid ${T.color.sandstone}`,
                background: isSelected ? T.color.terracotta : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "#FFF", transition: "all .15s",
              }}>
                {isSelected && "\u2713"}
              </div>
            ) : (
              <div style={{ width: 20, flexShrink: 0 }} />
            )}

            {/* Thumbnail / icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0, overflow: "hidden",
              background: T.color.warmStone,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
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
                fontFamily: T.font.body, fontSize: 13, fontWeight: isFolder ? 500 : 400,
                color: T.color.charcoal,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {item.name}
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: 10, color: T.color.muted,
                display: "flex", gap: 8,
              }}>
                {isFolder && item.childCount != null && (
                  <span>{item.childCount} items</span>
                )}
                {!isFolder && item.size != null && item.size > 0 && (
                  <span>{formatBytes(item.size)}</span>
                )}
                {item.modified && (
                  <span>{new Date(item.modified).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Folder arrow */}
            {isFolder && (
              <span style={{
                color: T.color.muted, fontSize: 14, flexShrink: 0,
              }}>{"\u203A"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
