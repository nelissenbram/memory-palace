"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useKepStore } from "@/lib/stores/kepStore";
import TuscanCard from "@/components/ui/TuscanCard";
import type { Kep } from "@/types/kep";

export default function KepsPage() {
  const { t } = useTranslation("kep");
  const router = useRouter();
  const { keps, isLoading, fetchKeps } = useKepStore();

  useEffect(() => {
    fetchKeps();
  }, [fetchKeps]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>{t("title")}</h1>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0" }}>{t("subtitle")}</p>
        </div>
        <button
          onClick={() => router.push("/palace/keps/new")}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            background: "#b45309",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          + {t("createNew")}
        </button>
      </div>

      {/* Pending captures banner */}
      <PendingBanner />

      {/* Keps grid */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          {t("common:loading") || "Loading..."}
        </div>
      ) : keps.length === 0 ? (
        <EmptyState t={t} onCreateClick={() => router.push("/palace/keps/new")} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))", gap: "1rem" }}>
          {keps.map((kep) => (
            <KepCard key={kep.id} kep={kep} onClick={() => router.push(`/palace/keps/${kep.id}`)} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function KepCard({ kep, onClick, t }: { kep: Kep; onClick: () => void; t: (key: string, params?: Record<string, string>) => string }) {
  const statusColors: Record<string, string> = {
    draft: "#6b7280",
    active: "#10b981",
    paused: "#f59e0b",
    closed: "#ef4444",
  };

  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <TuscanCard>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>{kep.icon}</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{kep.name}</h3>
            <span style={{
              fontSize: "0.75rem",
              color: statusColors[kep.status] || "#6b7280",
              fontWeight: 500,
            }}>
              {t(`status${kep.status.charAt(0).toUpperCase() + kep.status.slice(1)}`)}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "1rem", background: "#f3f4f6" }}>
            {kep.source_type === "whatsapp" ? "💬" : "📸"} {kep.source_type}
          </span>
        </div>

        {kep.description && (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.4 }}>
            {kep.description}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af" }}>
          <span>{t("memoriesCaptured", { count: String(kep.memories_captured) })}</span>
          {kep.last_capture_at && (
            <span>{t("lastCapture", { time: String(new Date(kep.last_capture_at).toLocaleDateString()) })}</span>
          )}
        </div>
      </TuscanCard>
    </div>
  );
}

function PendingBanner() {
  const { t } = useTranslation("kep");
  const router = useRouter();
  const { pendingCaptures, fetchPendingCaptures } = useKepStore();

  useEffect(() => {
    fetchPendingCaptures();
  }, [fetchPendingCaptures]);

  if (pendingCaptures.length === 0) return null;

  return (
    <div
      onClick={() => router.push("/palace/pending")}
      style={{
        padding: "0.875rem 1.25rem",
        marginBottom: "1.5rem",
        borderRadius: "0.5rem",
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <span style={{ fontSize: "1.25rem" }}>📬</span>
      <div>
        <strong>{pendingCaptures.length} {t("pendingCaptures")}</strong>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#92400e" }}>{t("pendingDesc")}</p>
      </div>
    </div>
  );
}

function EmptyState({ t, onCreateClick }: { t: (key: string, params?: Record<string, string>) => string; onCreateClick: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <span style={{ fontSize: "3rem" }}>📥</span>
      <h2 style={{ marginTop: "1rem", fontSize: "1.25rem" }}>{t("noKeps")}</h2>
      <p style={{ color: "#6b7280", maxWidth: "28rem", margin: "0.5rem auto 1.5rem" }}>{t("noKepsDesc")}</p>
      <button
        onClick={onCreateClick}
        style={{
          padding: "0.75rem 1.5rem",
          borderRadius: "0.5rem",
          background: "#b45309",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        + {t("createNew")}
      </button>
    </div>
  );
}
