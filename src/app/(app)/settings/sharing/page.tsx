"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { publishWing, unpublishWing } from "@/lib/social/share-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useRouter } from "next/navigation";
import { WINGS } from "@/lib/constants/wings";

interface WingData {
  id: string;
  slug: string;
  custom_name: string | null;
  published_at: string | null;
  publish_visibility: string | null;
}

function wingDisplayName(wing: WingData, tWings: (k: string) => string): string {
  if (wing.custom_name) return wing.custom_name;
  const def = WINGS.find((w) => w.id === wing.slug);
  if (def?.nameKey) {
    const translated = tWings(def.nameKey);
    if (translated !== def.nameKey) return translated;
    return def.name;
  }
  return wing.slug;
}

export default function SharingPage() {
  const { t } = useTranslation("settings");
  const { t: tWings } = useTranslation("wings");
  const { t: tc } = useTranslation("common");
  const { scale } = useAccessibility();
  const router = useRouter();

  const [wings, setWings] = useState<WingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("wings")
          .select("id, slug, custom_name, published_at, publish_visibility")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true });
        setWings(data || []);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = async (wing: WingData) => {
    const isPublished = !!wing.published_at;
    setSaving((prev) => ({ ...prev, [wing.id]: true }));
    if (isPublished) {
      const result = await unpublishWing(wing.id);
      if (result.ok) {
        setWings((prev) => prev.map((w) => w.id === wing.id ? { ...w, published_at: null, publish_visibility: "private" } : w));
        showToast(t("wingUnpublished"), "success");
      } else {
        showToast(t("wingToggleError"), "error");
      }
    } else {
      const result = await publishWing({ wingId: wing.id, visibility: "public" });
      if (result.ok) {
        setWings((prev) => prev.map((w) => w.id === wing.id ? { ...w, published_at: new Date().toISOString(), publish_visibility: "public" } : w));
        showToast(t("wingPublished"), "success");
      } else {
        showToast(result.error || t("wingToggleError"), "error");
      }
    }
    setSaving((prev) => ({ ...prev, [wing.id]: false }));
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
          padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
          background: toast.type === "success" ? T.color.sage : "#C05050",
          color: T.color.white, fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`,
          fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
        }}>
          {toast.message}
        </div>
      )}

      {/* Published Content Card */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        padding: "1.75rem 2rem",
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        marginBottom: "1.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h3 style={{
              fontFamily: T.font.display, fontSize: `${1.25 * scale}rem`, fontWeight: 500,
              color: T.color.charcoal, margin: "0 0 0.375rem",
            }}>
              {t("publishedContent")}
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, color: T.color.muted,
              margin: 0, lineHeight: 1.5,
            }}>
              {t("publishedContentDesc")}
            </p>
          </div>
          <button
            onClick={() => router.push("/library")}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.625rem",
              border: `1.5px solid ${T.color.terracotta}`,
              background: "transparent",
              fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: 600,
              color: T.color.terracotta,
              cursor: "pointer", flexShrink: 0, transition: "all .15s",
            }}
          >
            {t("manageInLibrary")}
          </button>
        </div>

        {loading ? (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, color: T.color.muted,
          }}>
            {t("loadingWings")}
          </div>
        ) : wings.length === 0 ? (
          <div style={{
            padding: "1.5rem 1.25rem", borderRadius: "0.75rem",
            background: T.color.linen, border: `1px solid ${T.color.cream}`,
            textAlign: "center",
            fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, color: T.color.muted,
          }}>
            {t("noWingsYet")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {wings.map((wing) => {
              const published = !!wing.published_at;
              const isSaving = !!saving[wing.id];
              return (
                <div
                  key={wing.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "1rem 1.25rem", borderRadius: "0.75rem",
                    background: published ? `${T.color.sage}08` : T.color.linen,
                    border: `1px solid ${published ? T.color.sage + "30" : T.color.cream}`,
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                    <span style={{
                      width: "0.5rem", height: "0.5rem", borderRadius: "50%", flexShrink: 0,
                      background: published ? T.color.sage : T.color.sandstone,
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: T.font.body, fontSize: `${0.9375 * scale}rem`, fontWeight: 500,
                        color: T.color.charcoal,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {wingDisplayName(wing, tWings)}
                      </div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: `${0.75 * scale}rem`, color: T.color.muted,
                        marginTop: "0.125rem",
                      }}>
                        {published
                          ? `${t("publishedOn")} ${new Date(wing.published_at!).toLocaleDateString()}`
                          : t("private")}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggle(wing)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${published ? "#C0505033" : T.color.sage + "50"}`,
                      background: published ? "#C0505008" : `${T.color.sage}10`,
                      fontFamily: T.font.body, fontSize: `${0.8125 * scale}rem`, fontWeight: 600,
                      color: published ? "#C05050" : T.color.sage,
                      cursor: isSaving ? "wait" : "pointer",
                      flexShrink: 0,
                      opacity: isSaving ? 0.6 : 1,
                      transition: "all .15s",
                      minHeight: "2.25rem",
                    }}
                  >
                    {isSaving
                      ? t("saving")
                      : published ? t("unpublish") : t("publish")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
