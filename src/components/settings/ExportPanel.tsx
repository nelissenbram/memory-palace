"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import JSZip from "jszip";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { scanExportTree, fetchSharedRoomMemoriesForExport } from "@/lib/auth/export-scan-action";
import type { ExportTree, ExportWingNode, ExportSharedWingNode } from "@/lib/auth/export-scan-action";

const META_CATEGORIES = [
  { key: "interviews", icon: "\u{1F3A4}", table: "interview_sessions", col: "user_id" },
  { key: "progress", icon: "\u{1F4CA}", table: "track_progress", col: "user_id" },
  { key: "points", icon: "\u2B50", table: "memory_points", col: "user_id" },
  { key: "family_tree", icon: "\u{1F333}", table: "family_tree_persons", col: "user_id" },
  { key: "family_groups", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", table: "family_groups", col: "owner_id" },
  { key: "legacy", icon: "\u{1F4DC}", table: "legacy_contacts", col: "user_id" },
  { key: "sharing", icon: "\u{1F517}", table: "room_shares", col: "owner_id" },
  { key: "notifications", icon: "\u{1F514}", table: "notifications", col: "user_id" },
  { key: "connections", icon: "\u{1F50C}", table: "connected_accounts", col: "user_id" },
] as const;

interface ExportPanelProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function ExportPanel({ showToast }: ExportPanelProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const [exportOpen, setExportOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [tree, setTree] = useState<ExportTree | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Selection state
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [selectedSharedRooms, setSelectedSharedRooms] = useState<Record<string, Set<string>>>({}); // shareId → roomIds
  const [selectedMeta, setSelectedMeta] = useState<Record<string, boolean>>({});
  const [exportMaxPhotos, setExportMaxPhotos] = useState(50);
  const [expandedWings, setExpandedWings] = useState<Set<string>>(new Set());

  // Indeterminate checkbox refs
  const wingCheckRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleScan = async () => {
    setExportOpen(true);
    setScanning(true);
    try {
      const result = await scanExportTree();
      setTree(result);

      // Default: select all own rooms
      const allRoomIds = new Set<string>();
      for (const w of result.wings) {
        for (const r of w.rooms) allRoomIds.add(r.roomId);
      }
      setSelectedRooms(allRoomIds);

      // No shared rooms selected by default
      setSelectedSharedRooms({});

      // Select all meta with data
      const metaSel: Record<string, boolean> = {};
      for (const cat of META_CATEGORIES) {
        metaSel[cat.key] = (result.meta[cat.key] || 0) > 0;
      }
      setSelectedMeta(metaSel);

      // Expand all wings
      setExpandedWings(new Set(result.wings.map(w => w.slug)));

      // Photo slider
      const totalPhotos = result.wings.reduce((n, w) => n + w.rooms.reduce((m, r) => m + r.photoCount, 0), 0);
      setExportMaxPhotos(Math.min(totalPhotos || 50, 50));
    } catch { /* ignore */ }
    setScanning(false);
  };

  // Update indeterminate state for wing checkboxes
  useEffect(() => {
    if (!tree) return;
    for (const w of tree.wings) {
      const ref = wingCheckRefs.current[w.slug];
      if (!ref) continue;
      const roomIds = w.rooms.map(r => r.roomId);
      const selectedCount = roomIds.filter(id => selectedRooms.has(id)).length;
      ref.indeterminate = selectedCount > 0 && selectedCount < roomIds.length;
    }
  }, [tree, selectedRooms]);

  const toggleWing = (wing: ExportWingNode) => {
    const roomIds = wing.rooms.map(r => r.roomId);
    const allSelected = roomIds.every(id => selectedRooms.has(id));
    setSelectedRooms(prev => {
      const next = new Set(prev);
      for (const id of roomIds) {
        if (allSelected) next.delete(id); else next.add(id);
      }
      return next;
    });
  };

  const toggleRoom = (roomId: string) => {
    setSelectedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
      return next;
    });
  };

  const toggleSharedWing = (sw: ExportSharedWingNode) => {
    const roomIds = sw.rooms.map(r => r.roomId);
    const current = selectedSharedRooms[sw.shareId] || new Set();
    const allSelected = roomIds.every(id => current.has(id));
    setSelectedSharedRooms(prev => {
      const next = { ...prev };
      if (allSelected) {
        next[sw.shareId] = new Set();
      } else {
        next[sw.shareId] = new Set(roomIds);
      }
      return next;
    });
  };

  const toggleSharedRoom = (shareId: string, roomId: string) => {
    setSelectedSharedRooms(prev => {
      const next = { ...prev };
      const set = new Set(prev[shareId] || []);
      if (set.has(roomId)) set.delete(roomId); else set.add(roomId);
      next[shareId] = set;
      return next;
    });
  };

  const toggleExpanded = (key: string) => {
    setExpandedWings(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (!tree) return;
    const all = new Set<string>();
    for (const w of tree.wings) for (const r of w.rooms) all.add(r.roomId);
    setSelectedRooms(all);
    const sharedAll: Record<string, Set<string>> = {};
    for (const sw of tree.shared) sharedAll[sw.shareId] = new Set(sw.rooms.map(r => r.roomId));
    setSelectedSharedRooms(sharedAll);
    const metaSel: Record<string, boolean> = {};
    for (const cat of META_CATEGORIES) metaSel[cat.key] = (tree.meta[cat.key] || 0) > 0;
    setSelectedMeta(metaSel);
  };

  const selectNone = () => {
    setSelectedRooms(new Set());
    setSelectedSharedRooms({});
    setSelectedMeta({});
  };

  // Count totals
  const totalSelectedPhotos = tree ? tree.wings.reduce((n, w) =>
    n + w.rooms.filter(r => selectedRooms.has(r.roomId)).reduce((m, r) => m + r.photoCount, 0), 0
  ) + (tree.shared.reduce((n, sw) => {
    const set = selectedSharedRooms[sw.shareId] || new Set();
    return n + sw.rooms.filter(r => set.has(r.roomId)).reduce((m, r) => m + r.photoCount, 0);
  }, 0)) : 0;

  const hasSelection = selectedRooms.size > 0
    || Object.values(selectedSharedRooms).some(s => s.size > 0)
    || Object.values(selectedMeta).some(Boolean);

  // Export handler
  const handleExport = useCallback(async () => {
    if (exporting || !tree) return;
    setExporting(true);
    setExportProgress(5);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast(t("exportZipError"), "error"); setExporting(false); setExportProgress(0); return; }

      setExportProgress(10);

      // Fetch profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

      // Fetch own memories for selected rooms
      const ownRoomIds = Array.from(selectedRooms);
      let ownMemories: Record<string, unknown>[] = [];
      if (ownRoomIds.length > 0) {
        const { data } = await supabase.from("memories").select("*").in("room_id", ownRoomIds);
        ownMemories = data || [];
      }
      setExportProgress(20);

      // Fetch wings & rooms metadata
      const { data: wings } = await supabase.from("wings").select("*").eq("user_id", user.id);
      const { data: rooms } = await supabase.from("rooms").select("*").eq("user_id", user.id);
      setExportProgress(25);

      // Fetch shared memories
      const sharedMemories: Record<string, unknown>[] = [];
      const sharedEntries = Object.entries(selectedSharedRooms).filter(([, s]) => s.size > 0);
      for (const [shareId, roomSet] of sharedEntries) {
        for (const roomId of roomSet) {
          const mems = await fetchSharedRoomMemoriesForExport(shareId, roomId);
          sharedMemories.push(...mems);
        }
      }
      setExportProgress(35);

      // Fetch meta categories
      const sel = selectedMeta;
      const sq = async (table: string, col: string) => {
        try { const { data } = await supabase.from(table).select("*").eq(col, user.id); return data || []; }
        catch { return []; }
      };

      const [interviews, trackProgress, memoryPoints] = await Promise.all([
        sel.interviews ? sq("interview_sessions", "user_id") : [],
        sel.progress ? sq("track_progress", "user_id") : [],
        sel.points ? sq("memory_points", "user_id") : [],
      ]);
      const [familyTreePersons, familyTreeRels, familyGroups, familyMembers] = await Promise.all([
        sel.family_tree ? sq("family_tree_persons", "user_id") : [],
        sel.family_tree ? sq("family_tree_relationships", "user_id") : [],
        sel.family_groups ? sq("family_groups", "owner_id") : [],
        sel.family_groups ? sq("family_members", "user_id") : [],
      ]);
      const [legacyContacts, legacyMessages, legacySettings, legacyDeliveries] = await Promise.all([
        sel.legacy ? sq("legacy_contacts", "user_id") : [],
        sel.legacy ? sq("legacy_messages", "user_id") : [],
        sel.legacy ? sq("legacy_settings", "user_id") : [],
        sel.legacy ? sq("legacy_deliveries", "user_id") : [],
      ]);
      const [roomShares, publicShares, wingShares, connectedAccounts, notifications] = await Promise.all([
        sel.sharing ? sq("room_shares", "owner_id") : [],
        sel.sharing ? sq("public_shares", "user_id") : [],
        sel.sharing ? sq("wing_shares", "owner_id") : [],
        sel.connections ? sq("connected_accounts", "user_id") : [],
        sel.notifications ? sq("notifications", "user_id") : [],
      ]);
      setExportProgress(40);

      // Redact tokens
      const safeAccounts = connectedAccounts.map((a: Record<string, unknown>) => {
        const { access_token, refresh_token, ...rest } = a;
        return { ...rest, access_token: "[redacted]", refresh_token: "[redacted]" };
      });

      // Build data.json
      const exportData: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        profile: profile || null,
        wings: wings || [],
        rooms: rooms || [],
        memories: ownMemories,
      };
      if (sharedMemories.length > 0) exportData.shared_memories = sharedMemories;
      if (sel.interviews) exportData.interview_sessions = interviews;
      if (sel.progress) exportData.track_progress = trackProgress;
      if (sel.points) exportData.memory_points = memoryPoints;
      if (sel.family_tree) { exportData.family_tree_persons = familyTreePersons; exportData.family_tree_relationships = familyTreeRels; }
      if (sel.family_groups) { exportData.family_groups = familyGroups; exportData.family_members = familyMembers; }
      if (sel.legacy) { exportData.legacy_contacts = legacyContacts; exportData.legacy_messages = legacyMessages; exportData.legacy_settings = legacySettings; exportData.legacy_deliveries = legacyDeliveries; }
      if (sel.sharing) { exportData.room_shares = roomShares; exportData.public_shares = publicShares; exportData.wing_shares = wingShares; }
      if (sel.connections) exportData.connected_accounts = safeAccounts;
      if (sel.notifications) exportData.notifications = notifications;

      // Build ZIP
      const zip = new JSZip();
      zip.file("data.json", JSON.stringify(exportData, null, 2));
      setExportProgress(45);

      // Collect photo file paths from selected rooms only
      const allMems = [...ownMemories, ...sharedMemories];
      const storageFiles: string[] = [];
      for (const m of allMems) {
        const mem = m as Record<string, unknown>;
        if (mem.file_path) storageFiles.push(mem.file_path as string);
        else if (mem.file_url && typeof mem.file_url === "string") storageFiles.push(mem.file_url);
      }

      const filesToDownload = storageFiles.slice(0, exportMaxPhotos);
      const photosFolder = zip.folder("photos");
      let failedCount = 0;
      if (photosFolder && filesToDownload.length > 0) {
        const usedNames = new Set<string>();
        const BATCH = 5;
        for (let i = 0; i < filesToDownload.length; i += BATCH) {
          const batch = filesToDownload.slice(i, i + BATCH);
          await Promise.allSettled(
            batch.map(async (filePath) => {
              try {
                const { data, error } = await supabase.storage.from("memories").download(filePath);
                if (error || !data) { failedCount++; return; }
                let name = filePath.split("/").pop() || filePath;
                if (usedNames.has(name)) {
                  const ext = name.includes(".") ? "." + name.split(".").pop() : "";
                  const base = name.replace(/\.[^.]+$/, "");
                  let c = 2;
                  while (usedNames.has(`${base}_${c}${ext}`)) c++;
                  name = `${base}_${c}${ext}`;
                }
                usedNames.add(name);
                photosFolder.file(name, await data.arrayBuffer());
              } catch { failedCount++; }
            }),
          );
          setExportProgress(45 + Math.round((Math.min(i + BATCH, filesToDownload.length) / filesToDownload.length) * 45));
        }
      }

      setExportProgress(92);
      const blob = await zip.generateAsync({ type: "blob" });
      setExportProgress(96);

      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `memory-palace-export-${new Date().toISOString().split("T")[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally { URL.revokeObjectURL(url); }

      setExportProgress(100);
      setExportOpen(false);

      const skipped = storageFiles.length - filesToDownload.length;
      if (failedCount > 0 || skipped > 0) {
        showToast(t("exportZipPartial", { count: String(failedCount + skipped) }), "error");
      } else {
        showToast(t("exportZipSuccess"), "success");
      }
    } catch (err) {
      console.error("Export error:", err);
      showToast(t("exportZipError"), "error");
    }
    setExportProgress(0);
    setExporting(false);
  }, [tree, selectedRooms, selectedSharedRooms, selectedMeta, exportMaxPhotos, exporting, showToast, t]);

  const metaLabel = (key: string) => {
    const labels: Record<string, string> = {
      interviews: t("exportCatInterviews"),
      progress: t("exportCatProgress"),
      points: t("exportCatPoints"),
      family_tree: t("exportCatFamilyTree"),
      family_groups: t("exportCatFamily"),
      legacy: t("exportCatLegacy"),
      sharing: t("exportCatSharing"),
      notifications: t("exportCatNotifications"),
      connections: t("exportCatConnections"),
    };
    return labels[key] || key;
  };

  return (
    <div style={{
      padding: "1.125rem 1.25rem", borderRadius: "0.75rem",
      background: T.color.linen, border: `1px solid ${T.color.cream}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500, color: T.color.charcoal }}>
            {t("exportZip")}
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.25rem", maxWidth: "23.75rem", lineHeight: 1.4 }}>
            {t("exportZipDesc")}
          </div>
        </div>
        {!exportOpen && !exporting && (
          <button onClick={handleScan} style={{
            padding: "0.75rem 1.5rem", borderRadius: "0.625rem",
            border: `1px solid ${T.color.cream}`, background: T.color.white,
            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
            color: T.color.charcoal, cursor: "pointer", flexShrink: 0,
          }}>
            {t("exportZip")}
          </button>
        )}
      </div>

      {/* Selection panel */}
      {exportOpen && !exporting && (
        <div style={{ marginTop: "1rem" }}>
          {scanning ? (
            <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, textAlign: "center", padding: "1.5rem 0" }}>
              {t("exportScanning")}
            </div>
          ) : tree ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Select all / none */}
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.25rem", fontFamily: T.font.body, fontSize: "0.75rem" }}>
                <button onClick={selectAll} style={{ background: "none", border: "none", color: T.color.terracotta, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", padding: 0 }}>
                  {t("exportSelectAll")}
                </button>
                <button onClick={selectNone} style={{ background: "none", border: "none", color: T.color.muted, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", padding: 0 }}>
                  {t("exportSelectNone")}
                </button>
              </div>

              {/* ── My Palace ── */}
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.03rem", padding: "0.25rem 0" }}>
                {t("exportMyPalace")}
              </div>

              {tree.wings.map(wing => {
                const roomIds = wing.rooms.map(r => r.roomId);
                const selectedCount = roomIds.filter(id => selectedRooms.has(id)).length;
                const allSelected = selectedCount === roomIds.length;
                const isExpanded = expandedWings.has(wing.slug);
                const totalMems = wing.rooms.reduce((n, r) => n + r.memoryCount, 0);
                const totalPhotos = wing.rooms.reduce((n, r) => n + r.photoCount, 0);

                return (
                  <div key={wing.slug}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        ref={el => { wingCheckRefs.current[wing.slug] = el; }}
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleWing(wing)}
                        style={{ accentColor: T.color.terracotta, width: "1rem", height: "1rem", flexShrink: 0 }}
                      />
                      <button onClick={() => toggleExpanded(wing.slug)} style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        fontSize: "0.5625rem", color: T.color.muted, transition: "transform .2s",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                      }}>&#x25B6;</button>
                      <span style={{ fontSize: "1rem" }}>{wing.icon}</span>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal, flex: 1 }}>
                        {wing.name}
                      </span>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                        {totalMems} {"\u{1F4A1}"}{totalPhotos > 0 ? ` · ${totalPhotos} \u{1F4F7}` : ""}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ paddingLeft: "2.25rem", display: "flex", flexDirection: "column", gap: "0.125rem", marginTop: "0.125rem" }}>
                        {wing.rooms.map(room => (
                          <label key={room.roomId} style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal,
                            cursor: "pointer", padding: "0.1875rem 0",
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRooms.has(room.roomId)}
                              onChange={() => toggleRoom(room.roomId)}
                              style={{ accentColor: T.color.terracotta, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                            />
                            <span style={{ fontSize: "0.875rem" }}>{room.icon}</span>
                            <span style={{ flex: 1 }}>{room.name}</span>
                            <span style={{ fontSize: "0.6875rem", color: T.color.muted }}>
                              {room.memoryCount}{room.photoCount > 0 ? ` · ${room.photoCount} \u{1F4F7}` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Shared with me ── */}
              {tree.shared.length > 0 && (
                <>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.03rem", padding: "0.5rem 0 0.25rem", marginTop: "0.25rem", borderTop: `1px solid ${T.color.cream}` }}>
                    {tc("sharedWithYou")}
                  </div>

                  {tree.shared.map(sw => {
                    const roomIds = sw.rooms.map(r => r.roomId);
                    const currentSet = selectedSharedRooms[sw.shareId] || new Set();
                    const selectedCount = roomIds.filter(id => currentSet.has(id)).length;
                    const allSelected = selectedCount === roomIds.length && roomIds.length > 0;
                    const isExpanded = expandedWings.has(`shared:${sw.shareId}`);
                    const totalMems = sw.rooms.reduce((n, r) => n + r.memoryCount, 0);
                    const totalPhotos = sw.rooms.reduce((n, r) => n + r.photoCount, 0);

                    return (
                      <div key={sw.shareId}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleSharedWing(sw)}
                            style={{ accentColor: T.color.terracotta, width: "1rem", height: "1rem", flexShrink: 0 }}
                          />
                          <button onClick={() => toggleExpanded(`shared:${sw.shareId}`)} style={{
                            background: "none", border: "none", cursor: "pointer", padding: 0,
                            fontSize: "0.5625rem", color: T.color.muted, transition: "transform .2s",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                          }}>&#x25B6;</button>
                          <span style={{ fontSize: "1rem" }}>{sw.wingIcon}</span>
                          <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal, flex: 1 }}>
                            {sw.wingName}
                          </span>
                          <span style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: T.color.sandstone }}>
                            {sw.ownerName}
                          </span>
                          <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                            {totalMems} {"\u{1F4A1}"}{totalPhotos > 0 ? ` · ${totalPhotos} \u{1F4F7}` : ""}
                          </span>
                        </div>

                        {isExpanded && (
                          <div style={{ paddingLeft: "2.25rem", display: "flex", flexDirection: "column", gap: "0.125rem", marginTop: "0.125rem" }}>
                            {sw.rooms.map(room => (
                              <label key={room.roomId} style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal,
                                cursor: "pointer", padding: "0.1875rem 0",
                              }}>
                                <input
                                  type="checkbox"
                                  checked={currentSet.has(room.roomId)}
                                  onChange={() => toggleSharedRoom(sw.shareId, room.roomId)}
                                  style={{ accentColor: T.color.terracotta, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "0.875rem" }}>{room.icon}</span>
                                <span style={{ flex: 1 }}>{room.name}</span>
                                <span style={{ fontSize: "0.6875rem", color: T.color.muted }}>
                                  {room.memoryCount}{room.photoCount > 0 ? ` · ${room.photoCount} \u{1F4F7}` : ""}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Other data ── */}
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.03rem", padding: "0.5rem 0 0.25rem", marginTop: "0.25rem", borderTop: `1px solid ${T.color.cream}` }}>
                {t("exportOtherData")}
              </div>
              {META_CATEGORIES.map(cat => {
                const count = tree.meta[cat.key] || 0;
                return (
                  <label key={cat.key} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    fontFamily: T.font.body, fontSize: "0.8125rem",
                    color: count === 0 ? T.color.muted : T.color.charcoal,
                    cursor: count === 0 ? "default" : "pointer",
                    opacity: count === 0 ? 0.5 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={!!selectedMeta[cat.key]}
                      disabled={count === 0}
                      onChange={e => setSelectedMeta(prev => ({ ...prev, [cat.key]: e.target.checked }))}
                      style={{ accentColor: T.color.terracotta, width: "1rem", height: "1rem", flexShrink: 0 }}
                    />
                    <span>{cat.icon}</span>
                    <span style={{ flex: 1 }}>{metaLabel(cat.key)}</span>
                    <span style={{ fontSize: "0.75rem", color: T.color.muted, minWidth: "3rem", textAlign: "right" }}>
                      {count}
                    </span>
                  </label>
                );
              })}

              {/* Photo slider */}
              {totalSelectedPhotos > 0 && (
                <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: T.color.white, borderRadius: "0.625rem", border: `1px solid ${T.color.cream}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
                      {t("exportMaxPhotos")}
                    </span>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: T.color.charcoal }}>
                      {Math.min(exportMaxPhotos, totalSelectedPhotos)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(totalSelectedPhotos, 500)}
                    value={Math.min(exportMaxPhotos, totalSelectedPhotos)}
                    onChange={e => setExportMaxPhotos(Number(e.target.value))}
                    style={{ width: "100%", accentColor: T.color.terracotta }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>
                    <span>1</span>
                    <span>{Math.min(totalSelectedPhotos, 500)}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.5rem" }}>
                <button
                  onClick={handleExport}
                  disabled={!hasSelection}
                  style={{
                    padding: "0.75rem 1.5rem", borderRadius: "0.625rem", border: "none",
                    background: hasSelection ? `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})` : T.color.sandstone,
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#FFF",
                    cursor: hasSelection ? "pointer" : "default",
                  }}>
                  {t("exportStart")}
                </button>
                <button
                  onClick={() => { setExportOpen(false); setTree(null); }}
                  style={{
                    padding: "0.75rem 1rem", borderRadius: "0.625rem",
                    border: `1px solid ${T.color.cream}`, background: "transparent",
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    color: T.color.muted, cursor: "pointer",
                  }}>
                  {tc("cancel")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Progress bar */}
      {exporting && exportProgress > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ height: "0.375rem", borderRadius: "0.1875rem", background: T.color.sandstone, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "0.1875rem",
              background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
              width: `${exportProgress}%`, transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginTop: "0.375rem", textAlign: "center" }}>
            {t("exportingProgress", { pct: String(exportProgress) })}
          </div>
        </div>
      )}
    </div>
  );
}
