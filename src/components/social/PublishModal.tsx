"use client";

import React, { useState, useTransition, useEffect } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { publishWing, publishRoom } from "@/lib/social/share-actions";
import { track } from "@/lib/analytics";

interface PublishModalProps {
  type: "wing" | "room";
  id: string;
  name: string;
  onClose: () => void;
  onPublished?: () => void;
}

export default function PublishModal({
  type,
  id,
  name,
  onClose,
  onPublished,
}: PublishModalProps) {
  const { t } = useTranslation("social");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPending, onClose]);

  const handlePublish = () => {
    startTransition(async () => {
      setError(null);
      const args = {
        description: description.trim() || undefined,
        visibility,
      };
      const result =
        type === "wing"
          ? await publishWing({ wingId: id, ...args })
          : await publishRoom({ roomId: id, ...args });

      if (!result.ok) {
        setError(result.error || t("publishError"));
        return;
      }

      track("social_publish", { type, id, visibility });
      onPublished?.();
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(0.25rem)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <TuscanCard
        variant="solid"
        padding="2rem"
        style={{ width: "min(28rem, 90vw)", maxHeight: "80vh", overflow: "auto" }}
      >
        <h2
          id="publish-title"
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: "0 0 0.25rem",
          }}
        >
          {t("publishTitle")}
        </h2>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: "0 0 1.5rem",
          }}
        >
          {t("publishSubtitle", { name })}
        </p>

        {/* Description */}
        <label
          htmlFor="publish-desc"
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            display: "block",
            marginBottom: "0.375rem",
          }}
        >
          {t("description")}
        </label>
        <textarea
          id="publish-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t("publishDescPlaceholder")}
          style={{
            width: "100%",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            padding: "0.625rem 0.875rem",
            borderRadius: "0.625rem",
            border: `1px solid ${T.color.sandstone}`,
            background: T.color.cream,
            color: T.color.charcoal,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            textAlign: "right",
            marginTop: "0.25rem",
          }}
        >
          {description.length}/500
        </div>

        {/* Visibility */}
        <label
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            display: "block",
            margin: "1.25rem 0 0.5rem",
          }}
        >
          {t("visibility")}
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["public", "followers"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              style={{
                flex: 1,
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: visibility === v ? 600 : 400,
                padding: "0.625rem",
                borderRadius: "0.5rem",
                border: `1px solid ${visibility === v ? T.color.gold : T.color.sandstone}`,
                background: visibility === v ? `${T.color.gold}15` : "transparent",
                color: visibility === v ? T.color.goldDark : T.color.walnut,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t(`visibility_${v}`)}
            </button>
          ))}
        </div>

        {error && (
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.error,
              margin: "1rem 0 0",
            }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.625rem",
              border: `1px solid ${T.color.sandstone}`,
              background: "transparent",
              color: T.color.walnut,
              cursor: "pointer",
            }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              padding: "0.625rem 1.5rem",
              borderRadius: "0.625rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
              color: T.color.cream,
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? t("publishing") : t("publish")}
          </button>
        </div>
      </TuscanCard>
    </div>
  );
}
