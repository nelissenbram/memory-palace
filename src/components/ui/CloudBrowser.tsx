"use client";
import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

export interface CloudItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  provider: string;
  isFolder: boolean;
  path: string;
}

const ChainLinkIcon = ({ size = "2.5rem", opacity = 0.5 }: { size?: string; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const FolderIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 24 24" fill={T.color.sandstone} stroke={T.color.walnut} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

interface CloudBrowserProps {
  provider: string;
  onClose: () => void;
  onImport: (items: CloudItem[]) => void;
}

export default function CloudBrowser({ provider, onClose, onImport }: CloudBrowserProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");

  const [status, setStatus] = useState<"loading" | "connected" | "not_connected" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [items, setItems] = useState<CloudItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState<string>("");

  const providerConfig: Record<string, { browseUrl: string; connectUrl: string; labelKey: string }> = {
    google_photos: { browseUrl: "/api/integrations/google/photos", connectUrl: "/api/integrations/google/connect", labelKey: "googlePhotos" },
    dropbox: { browseUrl: "/api/integrations/dropbox/browse", connectUrl: "/api/integrations/dropbox/connect", labelKey: "dropbox" },
    onedrive: { browseUrl: "/api/integrations/onedrive/browse", connectUrl: "/api/integrations/onedrive/connect", labelKey: "onedrive" },
  };

  const config = providerConfig[provider] || { browseUrl: "", connectUrl: "", labelKey: provider };
  const providerLabel = t(config.labelKey);

  const fetchItems = useCallback(async (path: string) => {
    if (!config.browseUrl) { setStatus("not_connected"); return; }
    setStatus("loading");
    try {
      const url = path ? `${config.browseUrl}?path=${encodeURIComponent(path)}` : config.browseUrl;
      const res = await fetch(url);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error(`[CloudBrowser] ${provider} browse failed:`, errBody);
        const detail = errBody.grantedScopes
          ? `${errBody.error}\n\nGranted scopes: ${errBody.grantedScopes}`
          : errBody.error || `HTTP ${res.status}`;
        setErrorDetail(detail);
        if (res.status === 401) { setStatus("not_connected"); return; }
        setStatus("error"); return;
      }
      const data = await res.json();
      const cloudItems: CloudItem[] = (data.items || data.photos || data.files || []).map((item: Record<string, string | boolean | undefined>, i: number) => ({
        id: (item.id as string) || `${provider}-${i}`,
        name: (item.name as string) || (item.filename as string) || (item.title as string) || `${providerLabel} ${i + 1}`,
        thumbnailUrl: (item.thumbnailUrl as string) || (item.baseUrl as string) || (item.thumbnail as string) || "",
        provider,
        isFolder: item.isFolder === true || item.type === "folder" || item.mimeType === "application/vnd.google-apps.folder",
        path: (item.path as string) || (item.id as string) || "",
      }));
      setItems(cloudItems);
      setStatus("connected");
    } catch { setStatus("not_connected"); }
  }, [config.browseUrl, provider, providerLabel]);

  useEffect(() => { fetchItems(currentPath); }, [provider, currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const selectableItems = items.filter(i => !i.isFolder);
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(i => selected.has(i.id));
  const toggleSelectAll = () => {
    if (allSelectableSelected) setSelected(new Set());
    else setSelected(new Set(selectableItems.map(i => i.id)));
  };
  const navigateToFolder = (folderPath: string) => { setSelected(new Set()); setCurrentPath(folderPath); };
  const breadcrumbSegments = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <div role="presentation" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(44,44,42,.35)", backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{
        background: "rgba(255,255,255,.96)", backdropFilter: "blur(1.5rem) saturate(1.4)", WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
        borderRadius: "1.25rem", boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18)", border: `0.0625rem solid ${T.color.cream}`,
        width: "min(36rem, 92vw)", maxHeight: "min(36rem, 85vh)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${T.color.cream}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>
                {t("cloudBrowseTitle", { provider: providerLabel })}
              </h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
                {status === "connected" ? t("cloudBrowseConnected", { count: String(items.length) }) : t("cloudBrowseLoading")}
              </p>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
          </div>
          {status === "connected" && (
            <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
              <button onClick={() => navigateToFolder("")} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem 0.25rem", fontFamily: T.font.body, fontSize: "0.75rem", color: currentPath ? T.color.terracotta : T.color.charcoal, fontWeight: currentPath ? 500 : 600, textDecoration: currentPath ? "underline" : "none" }}>
                {t("cloudBreadcrumbRoot")}
              </button>
              {breadcrumbSegments.map((seg, i) => {
                const segPath = breadcrumbSegments.slice(0, i + 1).join("/");
                const isLast = i === breadcrumbSegments.length - 1;
                return (
                  <span key={segPath} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>/</span>
                    <button onClick={() => !isLast && navigateToFolder(segPath)} style={{ background: "none", border: "none", cursor: isLast ? "default" : "pointer", padding: "0.125rem 0.25rem", fontFamily: T.font.body, fontSize: "0.75rem", color: isLast ? T.color.charcoal : T.color.terracotta, fontWeight: isLast ? 600 : 500, textDecoration: isLast ? "none" : "underline" }}>
                      {seg}
                    </button>
                  </span>
                );
              })}
            </nav>
          )}
          {status === "connected" && selectableItems.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
              <button onClick={toggleSelectAll} style={{ background: "none", border: `0.0625rem solid ${T.color.cream}`, borderRadius: "0.375rem", padding: "0.25rem 0.625rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, color: T.color.walnut }}>
                {allSelectableSelected ? t("cloudDeselectAll") : t("cloudSelectAll")}
              </button>
              {selected.size > 0 && (
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                  {t("cloudItemsSelected", { count: String(selected.size) })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem 1.5rem" }}>
          {status === "loading" && (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("cloudBrowseLoading")}</div>
            </div>
          )}
          {status === "not_connected" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}><ChainLinkIcon /></div>
              <h4 style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: T.color.charcoal, margin: "0 0 0.5rem" }}>
                {t("cloudNotConnected", { provider: providerLabel })}
              </h4>
              <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginBottom: "1.25rem", lineHeight: 1.5 }}>
                {t("cloudConnectExplain", { provider: providerLabel })}
              </p>
              <button onClick={() => { window.location.href = config.connectUrl; }} style={{ padding: "0.625rem 1.5rem", borderRadius: "0.625rem", background: T.color.charcoal, color: T.color.linen, border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.03em" }}>
                {t("cloudConnectBtn", { provider: providerLabel })}
              </button>
              <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, marginTop: "0.75rem" }}>{t("cloudConnectHint")}</p>
            </div>
          )}
          {status === "error" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("cloudBrowseError")}</p>
              {errorDetail && (
                <pre style={{ fontFamily: "monospace", fontSize: "0.6875rem", color: T.color.terracotta, marginTop: "0.75rem", whiteSpace: "pre-wrap", wordBreak: "break-all", textAlign: "left", background: "rgba(0,0,0,.04)", padding: "0.75rem", borderRadius: "0.5rem" }}>{errorDetail}</pre>
              )}
            </div>
          )}
          {status === "connected" && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("cloudBrowseEmpty")}</p>
            </div>
          )}
          {status === "connected" && items.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)", gap: "0.75rem" }}>
              {items.map(item => {
                if (item.isFolder) {
                  return (
                    <button key={item.id} onClick={() => navigateToFolder(item.path)} style={{ position: "relative", borderRadius: "0.625rem", overflow: "hidden", border: `0.0625rem solid ${T.color.cream}`, background: T.color.linen, cursor: "pointer", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.375rem", padding: 0 }}>
                      <FolderIcon />
                      <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.walnut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "90%", padding: "0 0.25rem" }}>{item.name}</span>
                    </button>
                  );
                }
                const isSelected = selected.has(item.id);
                return (
                  <button key={item.id} onClick={() => toggleSelect(item.id)} style={{ position: "relative", borderRadius: "0.625rem", overflow: "hidden", border: isSelected ? `0.125rem solid ${T.color.terracotta}` : `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, cursor: "pointer", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    {item.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.thumbnailUrl} alt={item.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5" style={{ opacity: 0.3 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                    )}
                    {isSelected && (
                      <div style={{ position: "absolute", top: "0.375rem", right: "0.375rem", width: "1.375rem", height: "1.375rem", borderRadius: "50%", background: T.color.terracotta, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0.125rem 0.25rem rgba(0,0,0,.2)" }}>
                        <svg width="0.75rem" height="0.75rem" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.45)", padding: "0.25rem 0.375rem" }}>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{item.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${T.color.cream}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
            {selected.size > 0 ? t("cloudSelected", { count: String(selected.size) }) : ""}
          </span>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button onClick={onClose} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.walnut }}>{tc("cancel")}</button>
            {selected.size > 0 && (
              <button onClick={() => onImport(items.filter(i => selected.has(i.id)))} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: T.color.terracotta, color: "#FFF", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600 }}>
                {t("cloudImportSelected", { count: String(selected.size) })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
