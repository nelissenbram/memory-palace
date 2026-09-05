"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE, TRAY } from "@/lib/libraryTokens";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { scanExportTree, fetchSharedRoomMemoriesForExport } from "@/lib/auth/export-scan-action";
import type { ExportTree, ExportWingNode, ExportSharedWingNode } from "@/lib/auth/export-scan-action";
import { WingIcon, RoomIcon, WING_ICON_MAP, ROOM_ICON_MAP } from "@/components/ui/WingRoomIcons";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import { useRoomStore } from "@/lib/stores/roomStore";
import { flushSettingsToServer } from "@/lib/stores/settingsSync";

const META_CATEGORIES = [
  { key: "interviews", table: "interview_sessions", col: "user_id" },
  { key: "progress", table: "track_progress", col: "user_id" },
  { key: "points", table: "memory_points", col: "user_id" },
  { key: "family_tree", table: "family_tree_persons", col: "user_id" },
  { key: "family_groups", table: "family_groups", col: "created_by" },
  { key: "legacy", table: "legacy_contacts", col: "user_id" },
  { key: "sharing", table: "room_shares", col: "owner_id" },
  { key: "notifications", table: "notifications", col: "user_id" },
  { key: "connections", table: "connected_accounts", col: "user_id" },
] as const;

function MetaIcon({ name, color }: { name: string; color?: string }) {
  const s = {
    width: "0.875rem",
    height: "0.875rem",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color || EMBER_GLYPH,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "interviews":
      return (<svg {...s}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>);
    case "progress":
      return (<svg {...s}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
    case "points":
      return (<svg {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
    case "family_tree":
      return (<svg {...s}><path d="M12 22v-6" /><path d="M12 8V2" /><path d="M4 16h16" /><circle cx="12" cy="10" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><circle cx="12" cy="18" r="2" /></svg>);
    case "family_groups":
      return (<svg {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>);
    case "legacy":
      return (<svg {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
    case "sharing":
      return (<svg {...s}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>);
    case "notifications":
      return (<svg {...s}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>);
    case "connections":
      return (<svg {...s}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>);
    default:
      return null;
  }
}

function Chevron({ open, reduceMotion }: { open: boolean; reduceMotion: boolean }) {
  return (
    <svg
      width="0.75rem"
      height="0.75rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke={EMBER_GLYPH}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        display: "block",
        transition: reduceMotion ? "none" : "transform .2s",
        transform: open ? "rotate(90deg)" : "rotate(0)",
      }}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

interface ExportPanelProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function ExportPanel({ showToast }: ExportPanelProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const isMobile = useIsMobile();
  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  const getWings = useRoomStore((s) => s.getWings);

  const resolveRoomName = (room: { nameKey?: string; name: string; localId?: string }, wingSlug: string) => {
    if (room.nameKey) {
      const translated = tWings(room.nameKey);
      if (translated && translated !== room.nameKey) return translated;
    }
    // Look up custom display name from roomStore
    const wingRooms = getWingRooms(wingSlug);
    const slug = room.localId || room.name;
    const match = wingRooms.find((wr) => wr.id === slug);
    if (match) return match.name;
    return room.name;
  };
  const [exportOpen, setExportOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<"generic" | "auth" | null>(null);
  const [tree, setTree] = useState<ExportTree | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Reduced-motion preference (inline-only; no @media in styles).
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

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
    setScanError(null);
    setScanning(true);
    try {
      // Short-circuit an expired/logged-out session before scanning: the server
      // scan returns an empty tree for an unauthenticated caller, which would
      // otherwise look like a genuinely empty palace.
      const authClient = createClient();
      const { data: { user: scanUser } } = await authClient.auth.getUser();
      if (!scanUser) {
        setScanError("auth");
        setScanning(false);
        return;
      }

      // Flush latest roomStore settings to server before scanning,
      // so the server scan uses the exact same room tree the user sees.
      await flushSettingsToServer();

      const result = await scanExportTree();

      // The server scan counts family_groups only by created_by, but the
      // family_groups export payload is the UNION of family_groups (created_by)
      // AND family_members (user_id). Reconcile the meta count here so the
      // checkbox enable/disable state and the exported payload agree: a user who
      // only *belongs* to groups (no groups they created) still has exportable
      // family_members rows and must see a non-zero, selectable count.
      try {
        const { count: memberCount } = await authClient
          .from("family_members")
          .select("*", { count: "exact", head: true })
          .eq("user_id", scanUser.id);
        if (memberCount && memberCount > 0) {
          result.meta.family_groups = (result.meta.family_groups || 0) + memberCount;
        }
      } catch { /* keep the server-provided family_groups count */ }

      // Build a lookup from the server result: localId → { roomId (UUID), memoryCount, photoCount }
      const serverRoomMap: Record<string, { roomId: string; memoryCount: number; photoCount: number }> = {};
      for (const wing of result.wings) {
        for (const room of wing.rooms) {
          serverRoomMap[room.localId] = {
            roomId: room.roomId,
            memoryCount: room.memoryCount,
            photoCount: room.photoCount,
          };
        }
      }

      // Rebuild the wings array entirely from client-side roomStore (source of truth for structure)
      // and apply memory counts from the server result.
      const clientWings = getWings().filter((w) => w.id !== "attic");
      const rebuiltWings: ExportWingNode[] = clientWings
        .map((cw) => {
          const rooms = getWingRooms(cw.id);
          return {
            slug: cw.id,
            name: cw.name,
            icon: cw.icon,
            rooms: rooms.map((r) => {
              const srv = serverRoomMap[r.id];
              return {
                roomId: srv?.roomId || `local:${r.id}`,
                localId: r.id,
                name: r.name,
                nameKey: r.nameKey,
                icon: r.icon,
                memoryCount: srv?.memoryCount || 0,
                photoCount: srv?.photoCount || 0,
              };
            }),
          };
        })
        .filter((w) => w.rooms.length > 0);

      result.wings = rebuiltWings;

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
    } catch {
      // Network blip, expired session or server error: surface an error branch
      // with Retry + Cancel instead of leaving the panel open with no content.
      setScanError("generic");
    }
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

      // Fetch own memories for selected rooms (filter out local-only rooms without DB entries)
      const ownRoomIds = Array.from(selectedRooms).filter(id => !id.startsWith("local:"));
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
        sel.family_groups ? sq("family_groups", "created_by") : [],
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

      // Enrich wing/room names (DB stores slugs like "ro1", display names come from roomStore)
      const allWings = getWings();
      const enrichedWings = (wings || []).map((w: Record<string, unknown>) => {
        const def = allWings.find((wd) => wd.id === w.slug);
        return def ? { ...w, name: def.name } : w;
      });
      const enrichedRooms = (rooms || []).map((r: Record<string, unknown>) => {
        // Find the wing this room belongs to, then look up its display name
        const wingRow = (wings || []).find((w: Record<string, unknown>) => w.id === r.wing_id);
        if (wingRow) {
          const wingRooms = getWingRooms(wingRow.slug as string);
          const match = wingRooms.find((wr) => wr.id === r.name);
          if (match) return { ...r, name: match.name };
        }
        return r;
      });

      // Build data.json
      const exportData: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        profile: profile || null,
        wings: enrichedWings,
        rooms: enrichedRooms,
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

      // Build ZIP. Lazy-load JSZip (~100KB) here at the point of use so it is
      // NOT pulled into the /settings/security initial bundle for the vast
      // majority of users who open the page but never run an export.
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      zip.file("data.json", JSON.stringify(exportData, null, 2));
      setExportProgress(45);

      // Collect photo file paths from selected rooms only. Exclude legacy full
      // http(s) URLs up front: the proxy loop can only fetch file_path-style
      // paths, so counting these as "exportable" would inflate totals and trip
      // the partial-error toast even when everything fetchable was exported.
      const allMems = [...ownMemories, ...sharedMemories];
      const storageFiles: string[] = [];
      for (const m of allMems) {
        const mem = m as Record<string, unknown>;
        const candidate = (mem.file_path as string | undefined)
          || (typeof mem.file_url === "string" ? (mem.file_url as string) : undefined);
        if (!candidate) continue;
        if (candidate.startsWith("http://") || candidate.startsWith("https://")) continue;
        storageFiles.push(candidate);
      }

      const filesToDownload = storageFiles.slice(0, exportMaxPhotos);
      const photosFolder = zip.folder("photos");
      let failedCount = 0;
      if (photosFolder && filesToDownload.length > 0) {
        // Per-basename counter (starting suffix) avoids a rescanning while-loop;
        // usedNames still guards against a fresh name colliding with a renamed one.
        const nameCounts: Record<string, number> = {};
        const usedNames = new Set<string>();
        const BATCH = 5;
        for (let i = 0; i < filesToDownload.length; i += BATCH) {
          const batch = filesToDownload.slice(i, i + BATCH);
          await Promise.allSettled(
            batch.map(async (filePath) => {
              try {
                // Use media proxy for dual-backend support (R2 + Supabase).
                const proxyUrl = filePath.startsWith("/api/media/")
                  ? filePath
                  : `/api/media/memories/${filePath}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) { failedCount++; return; }
                const data = await response.blob();
                if (!data) { failedCount++; return; }
                const basename = filePath.split("/").pop() || filePath;
                let name = basename;
                if (usedNames.has(name)) {
                  const ext = basename.includes(".") ? "." + basename.split(".").pop() : "";
                  const base = basename.replace(/\.[^.]+$/, "");
                  let c = (nameCounts[basename] || 1) + 1;
                  while (usedNames.has(`${base}_${c}${ext}`)) c++;
                  nameCounts[basename] = c;
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

      // Photos intentionally left out by the slider cap are NOT failures — report
      // them as a neutral "capped" success. Reserve the error toast for genuine
      // proxy/download failures.
      const capped = storageFiles.length - filesToDownload.length;
      if (failedCount > 0) {
        showToast(t("exportZipPartial", { count: String(failedCount) }), "error");
      } else if (capped > 0) {
        showToast(t("exportZipCapped", { count: String(capped) }), "success");
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
      background: T.color.linen, border: `1px solid ${HAIRLINE}`,
    }}>
      <div style={{
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "0.75rem" : 0,
      }}>
        <div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500, color: INK }}>
            {t("exportZip")}
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "0.25rem", maxWidth: "23.75rem", lineHeight: 1.4 }}>
            {t("exportZipDesc")}
          </div>
        </div>
        {!exportOpen && !exporting && (
          <button onClick={handleScan} style={{
            padding: "0.75rem 1.5rem", borderRadius: "0.625rem", minHeight: "2.75rem",
            border: `1px solid ${HAIRLINE}`, background: T.color.white,
            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
            color: INK, cursor: "pointer", flexShrink: 0,
            width: isMobile ? "100%" : undefined,
          }}>
            {t("exportZip")}
          </button>
        )}
      </div>

      {/* Selection panel */}
      {exportOpen && !exporting && (
        <div style={{ marginTop: "1rem" }}>
          {scanning ? (
            <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: MUTED, textAlign: "center", padding: "1.5rem 0" }}>
              {t("exportScanning")}
            </div>
          ) : scanError ? (
            <div style={{
              display: "flex", flexDirection: "column", gap: "0.75rem",
              padding: "1.25rem", borderRadius: "0.625rem",
              background: T.color.white, border: `1px solid ${HAIRLINE}`,
            }}>
              <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: INK, lineHeight: 1.4 }}>
                {scanError === "auth" ? t("exportScanAuthError") : t("exportScanError")}
              </div>
              <div style={{
                display: "flex", gap: "0.625rem",
                flexDirection: isMobile ? "column" : "row",
              }}>
                <button
                  onClick={handleScan}
                  style={{
                    padding: "0.75rem 1.5rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                    border: "none", background: EMBER,
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, color: "#FFF",
                    cursor: "pointer", width: isMobile ? "100%" : undefined,
                  }}>
                  {t("exportRetry")}
                </button>
                <button
                  onClick={() => { setExportOpen(false); setScanError(null); setTree(null); }}
                  style={{
                    padding: "0.75rem 1rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                    border: `1px solid ${HAIRLINE}`, background: "transparent",
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    color: MUTED, cursor: "pointer", width: isMobile ? "100%" : undefined,
                  }}>
                  {tc("cancel")}
                </button>
              </div>
            </div>
          ) : tree ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Select all / none */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", fontFamily: T.font.body, fontSize: "0.75rem" }}>
                <button onClick={selectAll} style={{
                  background: "none", border: "none", color: EMBER, cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  textDecoration: "underline", textUnderlineOffset: "0.125rem",
                  padding: isMobile ? "0.5rem 0.5rem" : "0.375rem 0.25rem",
                  minHeight: isMobile ? "2.75rem" : undefined,
                }}>
                  {t("exportSelectAll")}
                </button>
                <button onClick={selectNone} style={{
                  background: "none", border: "none", color: MUTED, cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  textDecoration: "underline", textUnderlineOffset: "0.125rem",
                  padding: isMobile ? "0.5rem 0.5rem" : "0.375rem 0.25rem",
                  minHeight: isMobile ? "2.75rem" : undefined,
                }}>
                  {t("exportSelectNone")}
                </button>
              </div>

              {/* ── My Palace ── */}
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.03rem", padding: "0.25rem 0" }}>
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
                      <button
                        onClick={() => toggleExpanded(wing.slug)}
                        aria-label={isExpanded ? tc("collapse") : tc("expand")}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          display: "inline-flex", alignItems: "center", flexShrink: 0,
                          minHeight: isMobile ? "2.75rem" : undefined,
                          minWidth: isMobile ? "2.75rem" : undefined,
                          justifyContent: "center",
                        }}>
                        <Chevron open={isExpanded} reduceMotion={reduceMotion} />
                      </button>
                      <label style={{
                        display: "flex", alignItems: "center", gap: "0.5rem", flex: 1,
                        cursor: "pointer", minHeight: isMobile ? "2.75rem" : undefined,
                      }}>
                        <input
                          ref={el => { wingCheckRefs.current[wing.slug] = el; }}
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleWing(wing)}
                          style={{ accentColor: EMBER, width: "1rem", height: "1rem", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: "1rem", display: "inline-flex", alignItems: "center" }} aria-hidden="true">
                          {WING_ICON_MAP[wing.slug]
                            ? <WingIcon wingId={wing.slug} size={14} color={T.color.walnut} />
                            : wing.icon}
                        </span>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: INK, flex: 1 }}>
                          {(() => { const tr = tWings(wing.slug); return tr && tr !== wing.slug ? tr : wing.name; })()}
                        </span>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>
                          {totalMems} {t("exportMemLabel")}{totalPhotos > 0 ? ` · ${totalPhotos} ${t("exportPhotoLabel")}` : ""}
                        </span>
                      </label>
                    </div>

                    {isExpanded && (
                      <div style={{ paddingLeft: "2.25rem", display: "flex", flexDirection: "column", gap: "0.125rem", marginTop: "0.125rem" }}>
                        {wing.rooms.map(room => (
                          <label key={room.roomId} style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.75rem", color: INK,
                            cursor: "pointer", padding: "0.1875rem 0",
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRooms.has(room.roomId)}
                              onChange={() => toggleRoom(room.roomId)}
                              style={{ accentColor: EMBER, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                            />
                            <span style={{ fontSize: "0.875rem", display: "inline-flex", alignItems: "center" }}>
                              {ROOM_ICON_MAP[room.roomId] || WING_ICON_MAP[wing.slug]
                                ? <RoomIcon roomId={room.roomId} wingId={wing.slug} size={14} color={T.color.walnut} />
                                : room.icon}
                            </span>
                            <span style={{ flex: 1 }}>{resolveRoomName(room, wing.slug)}</span>
                            <span style={{ fontSize: "0.6875rem", color: MUTED }}>
                              {room.memoryCount}{room.photoCount > 0 ? ` · ${room.photoCount} ${t("exportPhotoLabel")}` : ""}
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
                  <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.03rem", padding: "0.5rem 0 0.25rem", marginTop: "0.25rem", borderTop: `1px solid ${HAIRLINE}` }}>
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
                          <button
                            onClick={() => toggleExpanded(`shared:${sw.shareId}`)}
                            aria-label={isExpanded ? tc("collapse") : tc("expand")}
                            style={{
                              background: "none", border: "none", cursor: "pointer", padding: 0,
                              display: "inline-flex", alignItems: "center", flexShrink: 0,
                              minHeight: isMobile ? "2.75rem" : undefined,
                              minWidth: isMobile ? "2.75rem" : undefined,
                              justifyContent: "center",
                            }}>
                            <Chevron open={isExpanded} reduceMotion={reduceMotion} />
                          </button>
                          <label style={{
                            display: "flex", alignItems: "center", gap: "0.5rem", flex: 1,
                            cursor: "pointer", minHeight: isMobile ? "2.75rem" : undefined,
                          }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleSharedWing(sw)}
                              style={{ accentColor: EMBER, width: "1rem", height: "1rem", flexShrink: 0 }}
                            />
                            <span style={{ fontSize: "1rem", display: "inline-flex", alignItems: "center" }} aria-hidden="true">
                              {WING_ICON_MAP[sw.wingSlug]
                                ? <WingIcon wingId={sw.wingSlug} size={14} color={T.color.walnut} />
                                : sw.wingIcon}
                            </span>
                            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: INK, flex: 1 }}>
                              {sw.wingName}
                            </span>
                            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, color: MUTED }}>
                              {sw.ownerName}
                            </span>
                            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>
                              {totalMems} {t("exportMemLabel")}{totalPhotos > 0 ? ` · ${totalPhotos} ${t("exportPhotoLabel")}` : ""}
                            </span>
                          </label>
                        </div>

                        {isExpanded && (
                          <div style={{ paddingLeft: "2.25rem", display: "flex", flexDirection: "column", gap: "0.125rem", marginTop: "0.125rem" }}>
                            {sw.rooms.map(room => (
                              <label key={room.roomId} style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.75rem", color: INK,
                                cursor: "pointer", padding: "0.1875rem 0",
                              }}>
                                <input
                                  type="checkbox"
                                  checked={currentSet.has(room.roomId)}
                                  onChange={() => toggleSharedRoom(sw.shareId, room.roomId)}
                                  style={{ accentColor: EMBER, width: "0.875rem", height: "0.875rem", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "0.875rem", display: "inline-flex", alignItems: "center" }}>
                                  {ROOM_ICON_MAP[room.roomId] || WING_ICON_MAP[sw.wingSlug]
                                    ? <RoomIcon roomId={room.roomId} wingId={sw.wingSlug} size={14} color={T.color.walnut} />
                                    : room.icon}
                                </span>
                                <span style={{ flex: 1 }}>{resolveRoomName(room, sw.wingSlug)}</span>
                                <span style={{ fontSize: "0.6875rem", color: MUTED }}>
                                  {room.memoryCount}{room.photoCount > 0 ? ` · ${room.photoCount} ${t("exportPhotoLabel")}` : ""}
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
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.03rem", padding: "0.5rem 0 0.25rem", marginTop: "0.25rem", borderTop: `1px solid ${HAIRLINE}` }}>
                {t("exportOtherData")}
              </div>
              {META_CATEGORIES.map(cat => {
                const count = tree.meta[cat.key] || 0;
                return (
                  <label key={cat.key} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    fontFamily: T.font.body, fontSize: "0.8125rem",
                    color: count === 0 ? MUTED : INK,
                    cursor: count === 0 ? "default" : "pointer",
                    opacity: count === 0 ? 0.5 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={!!selectedMeta[cat.key]}
                      disabled={count === 0}
                      onChange={e => setSelectedMeta(prev => ({ ...prev, [cat.key]: e.target.checked }))}
                      style={{ accentColor: EMBER, width: "1rem", height: "1rem", flexShrink: 0 }}
                    />
                    <MetaIcon name={cat.key} />
                    <span style={{ flex: 1 }}>{metaLabel(cat.key)}</span>
                    <span style={{ fontSize: "0.75rem", color: MUTED, minWidth: "3rem", textAlign: "right" }}>
                      {count}
                    </span>
                  </label>
                );
              })}

              {/* Photo slider */}
              {totalSelectedPhotos > 0 && (
                <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: T.color.white, borderRadius: "0.625rem", border: `1px solid ${HAIRLINE}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span id="export-maxphotos-label" style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: MUTED }}>
                      {t("exportMaxPhotos")}
                    </span>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: INK }}>
                      {Math.min(exportMaxPhotos, totalSelectedPhotos)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(totalSelectedPhotos, 500)}
                    value={Math.min(exportMaxPhotos, totalSelectedPhotos)}
                    onChange={e => setExportMaxPhotos(Number(e.target.value))}
                    aria-labelledby="export-maxphotos-label"
                    aria-valuetext={String(Math.min(exportMaxPhotos, totalSelectedPhotos))}
                    style={{ width: "100%", accentColor: EMBER }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.body, fontSize: "0.625rem", color: MUTED }}>
                    <span>1</span>
                    <span>{Math.min(totalSelectedPhotos, 500)}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{
                display: "flex", gap: "0.625rem", marginTop: "0.5rem",
                flexDirection: isMobile ? "column" : "row",
              }}>
                <button
                  onClick={handleExport}
                  disabled={!hasSelection}
                  style={{
                    padding: "0.75rem 1.5rem", borderRadius: "0.625rem", border: "none", minHeight: "2.75rem",
                    background: hasSelection ? `linear-gradient(135deg, ${EMBER}, ${T.color.walnut})` : TRAY,
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                    color: hasSelection ? "#FFF" : MUTED,
                    cursor: hasSelection ? "pointer" : "default",
                    width: isMobile ? "100%" : undefined,
                  }}>
                  {t("exportStart")}
                </button>
                <button
                  onClick={() => { setExportOpen(false); setTree(null); }}
                  style={{
                    padding: "0.75rem 1rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                    border: `1px solid ${HAIRLINE}`, background: "transparent",
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    color: MUTED, cursor: "pointer",
                    width: isMobile ? "100%" : undefined,
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
          <div style={{ height: "0.375rem", borderRadius: "0.1875rem", background: TRAY, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "0.1875rem",
              background: `linear-gradient(90deg, ${EMBER}, ${T.color.walnut})`,
              width: `${exportProgress}%`, transition: reduceMotion ? "none" : "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: MUTED, marginTop: "0.375rem", textAlign: "center" }}>
            {t("exportingProgress", { pct: String(exportProgress) })}
          </div>
        </div>
      )}
    </div>
  );
}
