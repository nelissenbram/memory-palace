"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import { getMediaTypeIcon, getStatusColor, getStatusLabel } from "@/lib/kep/route-helpers";
import { WINGS } from "@/lib/constants/wings";
import { allocateVirtualRoom } from "@/lib/kep/join-actions";
import { T } from "@/lib/theme";
import type { Kep, KepCapture, KepStats } from "@/types/kep";

export default function KepDetailPage() {
  const { t } = useTranslation("kep");
  const params = useParams();
  const router = useRouter();
  const kepId = params.id as string;
  const { currentKep, captures, stats, isLoading, fetchKep, fetchCaptures, fetchStats, updateKep, deleteKep } = useKepStore();
  const [activeTab, setActiveTab] = useState<"captures" | "settings" | "stats">("captures");
  const [linkedRoom, setLinkedRoom] = useState<{ id: string; name: string; is_virtual: boolean; wing_id: string | null; memories: { id: string; title: string; type: string; file_url: string | null; created_at: string }[] } | null>(null);

  const fetchLinkedRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/keps/${kepId}/room`);
      if (res.ok) {
        const data = await res.json();
        setLinkedRoom(data);
      }
    } catch { /* no linked room */ }
  }, [kepId]);

  useEffect(() => {
    fetchKep(kepId);
    fetchCaptures(kepId);
    fetchStats(kepId);
    fetchLinkedRoom();
  }, [kepId, fetchKep, fetchCaptures, fetchStats, fetchLinkedRoom]);

  if (isLoading && !currentKep) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>{t("loading")}</div>;
  }

  if (!currentKep) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>{t("notFound")}</div>;
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateKep(kepId, { status: newStatus } as Partial<typeof currentKep>);
  };

  const handleDelete = async () => {
    if (confirm(t("deleteConfirm"))) {
      await deleteKep(kepId);
      router.push("/palace/keps");
    }
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/palace/keps")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}>
          ←
        </button>
        <span style={{ fontSize: "2rem" }}>{currentKep.icon}</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{currentKep.name}</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: getStatusColor(currentKep.status), fontWeight: 600 }}>
              ● {t(`status${currentKep.status.charAt(0).toUpperCase() + currentKep.status.slice(1)}`)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              {currentKep.source_type === "whatsapp" ? "💬" : "📸"} {currentKep.source_type}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {currentKep.status === "draft" && (
            <button onClick={() => handleStatusChange("active")} style={btnStyle("#10b981")}>
              {t("activate")}
            </button>
          )}
          {currentKep.status === "active" && (
            <button onClick={() => handleStatusChange("paused")} style={btnStyle("#f59e0b")}>
              {t("pause")}
            </button>
          )}
          {currentKep.status === "paused" && (
            <button onClick={() => handleStatusChange("active")} style={btnStyle("#10b981")}>
              {t("resume")}
            </button>
          )}
          <button onClick={handleDelete} style={btnStyle("#ef4444")}>
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
        {(["captures", "settings", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.625rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #b45309" : "2px solid transparent",
              color: activeTab === tab ? "#b45309" : "#6b7280",
              fontWeight: activeTab === tab ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {tab === "captures" ? t("pendingCaptures") : tab === "settings" ? t("settings") : t("stats")}
          </button>
        ))}
      </div>

      {/* Linked Room */}
      {linkedRoom && (
        <LinkedRoomSection room={linkedRoom} onAllocated={fetchLinkedRoom} t={t} />
      )}

      {/* Tab content */}
      {activeTab === "captures" && <CapturesTab captures={captures} t={t} />}
      {activeTab === "stats" && stats && <StatsTab stats={stats} t={t} />}
      {activeTab === "settings" && <SettingsTab kep={currentKep} t={t} />}
    </div>
  );
}

function CapturesTab({ captures, t }: { captures: KepCapture[]; t: (key: string, params?: Record<string, string>) => string }) {
  if (captures.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
        <span style={{ fontSize: "2rem" }}>📭</span>
        <p>{t("noPending")}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {captures.map((capture) => (
        <TuscanCard key={capture.id}>
          <div style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>{getMediaTypeIcon(capture.media_type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                {(capture.payload_preview as Record<string, unknown>)?.text as string || capture.transcription?.slice(0, 80) || `${capture.media_type} capture`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                {capture.source_sender && <span>{t("from", { name: capture.source_sender })} · </span>}
                {new Date(capture.created_at).toLocaleString()}
              </div>
            </div>
            <span style={{
              fontSize: "0.75rem",
              padding: "0.125rem 0.5rem",
              borderRadius: "1rem",
              background: getStatusColor(capture.status) + "20",
              color: getStatusColor(capture.status),
              fontWeight: 500,
            }}>
              {getStatusLabel(capture.status)}
            </span>
          </div>
        </TuscanCard>
      ))}
    </div>
  );
}

function StatsTab({ stats, t }: { stats: KepStats; t: (key: string, params?: Record<string, string>) => string }) {
  const items = [
    { label: t("totalCaptures"), value: stats.total_captures },
    { label: t("routedCaptures"), value: stats.routed_captures },
    { label: t("pendingCount"), value: stats.pending_captures },
    { label: t("rejectedCaptures"), value: stats.rejected_captures },
    { label: t("failedCaptures"), value: stats.failed_captures },
    { label: t("capturesToday"), value: stats.captures_today },
    { label: t("capturesWeek"), value: stats.captures_this_week },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))", gap: "1rem" }}>
      {items.map((item) => (
        <TuscanCard key={item.label}>
          <div style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{String(item.value)}</div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{item.label}</div>
          </div>
        </TuscanCard>
      ))}
    </div>
  );
}

function SettingsTab({ kep, t }: { kep: Kep; t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <TuscanCard>
      <div style={{ padding: "1.25rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.25rem" }}>{t("autoRoute")}</label>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>
            {t("autoRouteDesc")}
          </p>
          <div style={{ marginTop: "0.5rem", fontWeight: 600 }}>
            {kep.auto_route_enabled ? `✅ ${t("enabled")}` : `❌ ${t("disabled")}`}
          </div>
        </div>
        {kep.description && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.25rem" }}>{t("description")}</label>
            <p style={{ fontSize: "0.875rem", color: "#374151", margin: 0 }}>{kep.description as string}</p>
          </div>
        )}
      </div>
    </TuscanCard>
  );
}

function LinkedRoomSection({ room, onAllocated, t }: {
  room: { id: string; name: string; is_virtual: boolean; wing_id: string | null; memories: { id: string; title: string; type: string; file_url: string | null; created_at: string }[] };
  onAllocated: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const [allocating, setAllocating] = useState(false);
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [roomName, setRoomName] = useState(room.name);
  const [showAllocate, setShowAllocate] = useState(false);

  const handleAllocate = async () => {
    if (!selectedWing || !roomName.trim()) return;
    setAllocating(true);
    const result = await allocateVirtualRoom(room.id, selectedWing, roomName.trim());
    setAllocating(false);
    if (!result.error) {
      setShowAllocate(false);
      onAllocated();
    }
  };

  const wingName = room.wing_id ? WINGS.find(w => w.id === room.wing_id)?.name : null;

  return (
    <TuscanCard>
      <div style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>{room.is_virtual ? "📦" : "🏛"}</span>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{room.name}</span>
              <span style={{ fontSize: "0.75rem", color: T.color.muted, marginLeft: "0.5rem" }}>
                {room.is_virtual ? "Virtual room" : wingName || "Palace room"}
              </span>
            </div>
          </div>
          {room.is_virtual && !showAllocate && (
            <button onClick={() => setShowAllocate(true)} style={{
              padding: "0.375rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.75rem",
              background: T.color.terracotta, color: "#fff", border: "none", cursor: "pointer", fontWeight: 500,
            }}>
              Allocate to wing
            </button>
          )}
        </div>

        {/* Allocate form */}
        {showAllocate && (
          <div style={{ background: T.color.linen, padding: "1rem", borderRadius: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem", marginBottom: "0.75rem" }}>
              {WINGS.filter(w => w.id !== "attic").map(w => (
                <button key={w.id} onClick={() => setSelectedWing(w.id)} style={{
                  padding: "0.5rem", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.75rem",
                  border: selectedWing === w.id ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.cream}`,
                  background: selectedWing === w.id ? `${T.color.terracotta}10` : "#fff",
                }}>
                  {w.icon} {w.name}
                </button>
              ))}
            </div>
            <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: `1px solid ${T.color.cream}`, fontSize: "0.875rem", boxSizing: "border-box", marginBottom: "0.5rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleAllocate} disabled={!selectedWing || !roomName.trim() || allocating} style={{
                padding: "0.5rem 1rem", borderRadius: "0.375rem", background: selectedWing ? T.color.terracotta : T.color.cream,
                color: selectedWing ? "#fff" : T.color.muted, border: "none", cursor: selectedWing ? "pointer" : "default", fontSize: "0.8125rem",
              }}>
                {allocating ? "..." : "Move to wing"}
              </button>
              <button onClick={() => setShowAllocate(false)} style={{
                padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "none", border: `1px solid ${T.color.cream}`,
                cursor: "pointer", fontSize: "0.8125rem", color: T.color.muted,
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Memories */}
        {room.memories.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(5rem, 1fr))", gap: "0.5rem" }}>
            {room.memories.map(m => (
              <div key={m.id} style={{
                aspectRatio: "1", borderRadius: "0.5rem", overflow: "hidden", background: T.color.cream,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {m.file_url && (m.type === "photo" || m.type === "image") ? (
                  <img src={m.file_url} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "1.5rem" }}>{m.type === "video" ? "🎬" : m.type === "audio" ? "🎵" : "📄"}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: T.color.muted, margin: 0 }}>No memories yet</p>
        )}

        <p style={{ fontSize: "0.75rem", color: T.color.muted, margin: "0.5rem 0 0" }}>
          {room.memories.length} {room.memories.length === 1 ? "memory" : "memories"}
        </p>
      </div>
    </TuscanCard>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    borderRadius: "0.375rem",
    background: color,
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "0.8125rem",
  };
}
