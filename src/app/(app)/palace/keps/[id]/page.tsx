"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import { getMediaTypeIcon, getStatusColor, getStatusLabel } from "@/lib/kep/route-helpers";
import { T } from "@/lib/theme";
import { confirmDialog } from "@/lib/ui/confirm";
import type { Kep, KepCapture, KepStats } from "@/types/kep";

export default function KepDetailPage() {
  const { t } = useTranslation("kep");
  const params = useParams();
  const router = useRouter();
  const kepId = params.id as string;
  const { currentKep, captures, stats, isLoading, fetchKep, fetchCaptures, fetchStats, updateKep, deleteKep } = useKepStore();
  const [activeTab, setActiveTab] = useState<"captures" | "settings" | "stats">("captures");

  useEffect(() => {
    fetchKep(kepId);
    fetchCaptures(kepId);
    fetchStats(kepId);
  }, [kepId, fetchKep, fetchCaptures, fetchStats]);

  if (isLoading && !currentKep) {
    return <div style={{ padding: "3rem", textAlign: "center", color: T.color.muted }}>{t("loading")}</div>;
  }

  if (!currentKep) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>{t("notFound")}</div>;
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateKep(kepId, { status: newStatus } as Partial<typeof currentKep>);
  };

  const handleDelete = async () => {
    if (await confirmDialog({ message: t("deleteConfirm"), destructive: true })) {
      await deleteKep(kepId);
      router.push("/palace/keps");
    }
  };

  return (
    <div style={{ padding: "1.5rem", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))", maxWidth: "64rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/palace/keps")} aria-label={t("back") !== "back" ? t("back") : "Back"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", minHeight: "2.75rem", minWidth: "2.75rem", display: "flex", alignItems: "center", justifyContent: "center", color: T.color.charcoal }}>
          {"←"}
        </button>
        <span style={{ fontSize: "2rem" }}>{currentKep.icon}</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{currentKep.name}</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: getStatusColor(currentKep.status), fontWeight: 600 }}>
              ● {t(`status${currentKep.status.charAt(0).toUpperCase() + currentKep.status.slice(1)}`)}
            </span>
            <span style={{ fontSize: "0.75rem", color: T.color.muted }}>
              {currentKep.source_type === "whatsapp" ? "💬" : "📸"} {currentKep.source_type}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {currentKep.status === "draft" && (
            <button onClick={() => handleStatusChange("active")} style={btnStyle(T.color.sage)}>
              {t("activate")}
            </button>
          )}
          {currentKep.status === "active" && (
            <button onClick={() => handleStatusChange("paused")} style={btnStyle(T.color.gold)}>
              {t("pause")}
            </button>
          )}
          {currentKep.status === "paused" && (
            <button onClick={() => handleStatusChange("active")} style={btnStyle(T.color.sage)}>
              {t("resume")}
            </button>
          )}
          <button onClick={handleDelete} style={btnStyle(T.color.error)}>
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Active Room Section */}
      <ActiveRoomSection kepId={kepId} t={t} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: `1px solid ${T.color.cream}` }}>
        {(["captures", "settings", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.625rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? `2px solid ${T.color.terracotta}` : "2px solid transparent",
              color: activeTab === tab ? T.color.terracotta : T.color.muted,
              fontWeight: activeTab === tab ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {tab === "captures" ? t("pendingCaptures") : tab === "settings" ? t("settings") : t("stats")}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "captures" && <CapturesTab captures={captures} t={t} />}
      {activeTab === "stats" && stats && <StatsTab stats={stats} t={t} />}
      {activeTab === "settings" && <SettingsTab kep={currentKep} t={t} />}
    </div>
  );
}

function ActiveRoomSection({ kepId, t }: { kepId: string; t: (key: string, params?: Record<string, string>) => string }) {
  const [activeRoom, setActiveRoom] = useState<{ id: string; name: string; wingName: string } | null>(null);
  const [rooms, setRooms] = useState<{ id: string; name: string; wingName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchActiveRoom = useCallback(async () => {
    try {
      const [linkRes, roomsRes] = await Promise.all([
        fetch(`/api/keps/${kepId}/active-room`).catch(() => null),
        fetch(`/api/keps/rooms`).catch(() => null),
      ]);

      // Get active room from link data
      if (linkRes?.ok) {
        const data = await linkRes.json();
        setActiveRoom(data.activeRoom || null);
      }

      // Get all rooms for the picker
      if (roomsRes?.ok) {
        const data = await roomsRes.json();
        const allRooms: { id: string; name: string; wingName: string }[] = [];
        for (const wing of data.wings || []) {
          for (const room of wing.rooms || []) {
            allRooms.push({ id: room.id, name: room.name, wingName: wing.name });
          }
        }
        setRooms(allRooms);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [kepId]);

  useEffect(() => { fetchActiveRoom(); }, [fetchActiveRoom]);

  const handleSetRoom = async (roomId: string | null) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/keps/${kepId}/active-room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoom(data.activeRoom || null);
      }
    } catch { /* ignore */ }
    setUpdating(false);
  };

  if (loading) return null;

  return (
    <TuscanCard>
      <div style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📍</span>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                {t("activeRoom") || "Active Room"}
              </span>
              <span style={{ fontSize: "0.75rem", color: T.color.muted, marginLeft: "0.5rem" }}>
                {activeRoom
                  ? `${activeRoom.wingName} / ${activeRoom.name}`
                  : t("aiRouting") || "AI routing"
                }
              </span>
            </div>
          </div>
          {activeRoom && (
            <button
              onClick={() => handleSetRoom(null)}
              disabled={updating}
              style={{
                padding: "0.375rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.75rem",
                background: T.color.cream, color: T.color.muted, border: "none",
                cursor: updating ? "default" : "pointer", fontWeight: 500,
              }}
            >
              {t("useAiRouting") || "Use AI routing"}
            </button>
          )}
        </div>

        {/* Room picker */}
        {rooms.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSetRoom(room.id)}
                disabled={updating}
                style={{
                  padding: "0.375rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.75rem",
                  border: activeRoom?.id === room.id ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.cream}`,
                  background: activeRoom?.id === room.id ? `${T.color.terracotta}10` : "#fff",
                  cursor: updating ? "default" : "pointer",
                  fontWeight: activeRoom?.id === room.id ? 600 : 400,
                }}
              >
                {room.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </TuscanCard>
  );
}

function CapturesTab({ captures, t }: { captures: KepCapture[]; t: (key: string, params?: Record<string, string>) => string }) {
  if (captures.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: T.color.muted }}>
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
              <div style={{ fontSize: "0.75rem", color: T.color.muted, marginTop: "0.25rem" }}>
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
            <div style={{ fontSize: "0.75rem", color: T.color.muted, marginTop: "0.25rem" }}>{item.label}</div>
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
          <p style={{ fontSize: "0.75rem", color: T.color.muted, margin: 0 }}>
            {t("autoRouteDesc")}
          </p>
          <div style={{ marginTop: "0.5rem", fontWeight: 600 }}>
            {kep.auto_route_enabled ? `✅ ${t("enabled")}` : `❌ ${t("disabled")}`}
          </div>
        </div>
        {kep.description && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.25rem" }}>{t("description")}</label>
            <p style={{ fontSize: "0.875rem", color: T.color.inkSoft, margin: 0 }}>{kep.description as string}</p>
          </div>
        )}
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
