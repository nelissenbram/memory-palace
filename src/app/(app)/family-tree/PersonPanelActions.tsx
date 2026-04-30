"use client";

import { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { deletePerson } from "@/lib/auth/family-tree-actions";
import type { FamilyTreePerson } from "@/lib/auth/family-tree-actions";
import { SectionCard, pillBtnStyle } from "./PersonPanelShared";

/* ── Navigation actions: Recenter and Focus buttons ── */

interface PersonPanelNavActionsProps {
  person: FamilyTreePerson;
  isCurrentUser: boolean;
  onClose: () => void;
  onRecenter?: (person: FamilyTreePerson) => void;
  onFocus?: (person: FamilyTreePerson) => void;
  onViewDescendants?: (person: FamilyTreePerson) => void;
}

export function PersonPanelNavActions({
  person,
  isCurrentUser,
  onClose,
  onRecenter,
  onFocus,
  onViewDescendants,
}: PersonPanelNavActionsProps) {
  const { t } = useTranslation("familyTree");

  return (
    <>
      {/* View This Tree button */}
      {onRecenter && !isCurrentUser && (
        <button
          onClick={() => {
            onRecenter(person);
            onClose();
          }}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            background: `${T.color.sage}18`,
            color: T.color.sage,
            border: `1px solid ${T.color.sage}40`,
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            minHeight: "2.75rem",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.sage} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          {t("viewThisTree")}
        </button>
      )}

      {/* Focus button */}
      {onFocus && (
        <button
          onClick={() => {
            onFocus(person);
            onClose();
          }}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            background: `${T.color.terracotta}12`,
            color: T.color.terracotta,
            border: `1px solid ${T.color.terracotta}30`,
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            minHeight: "2.75rem",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.terracotta} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M3 12h3M18 12h3M12 3v3M12 18v3" />
          </svg>
          {t("focusMode")}
        </button>
      )}

      {/* View descendants button */}
      {onViewDescendants && (
        <button
          onClick={() => {
            onViewDescendants(person);
            onClose();
          }}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            borderRadius: "0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            background: `${T.color.walnut}12`,
            color: T.color.walnut,
            border: `1px solid ${T.color.walnut}30`,
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            minHeight: "2.75rem",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.walnut} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="4" r="2" />
            <line x1="12" y1="6" x2="12" y2="10" />
            <line x1="6" y1="10" x2="18" y2="10" />
            <line x1="6" y1="10" x2="6" y2="14" />
            <line x1="18" y1="10" x2="18" y2="14" />
            <circle cx="6" cy="16" r="2" />
            <circle cx="18" cy="16" r="2" />
          </svg>
          {t("viewDescendants")}
        </button>
      )}
    </>
  );
}

/* ── Delete action: confirmation and delete button ── */

interface PersonPanelDeleteProps {
  person: FamilyTreePerson;
  fullName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function PersonPanelDelete({
  person,
  fullName,
  onClose,
  onUpdate,
}: PersonPanelDeleteProps) {
  const { t } = useTranslation("familyTree");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    const result = await deletePerson(person.id);
    if (result && "error" in result && result.error) {
      return;
    }
    onUpdate();
    onClose();
  };

  return (
    <div style={{ paddingTop: "0.25rem" }}>
      {confirmDelete ? (
        <SectionCard
          style={{
            border: `1px solid ${T.color.error}30`,
            background: `${T.color.error}08`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.error,
                textAlign: "center",
              }}
            >
              {t("confirmDelete", { name: fullName })}
            </span>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={handleDelete}
                style={{
                  ...pillBtnStyle,
                  background: T.color.error,
                  color: T.color.white,
                  fontSize: "0.8125rem",
                  padding: "0.5rem 1.25rem",
                }}
              >
                {t("yesDelete")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  ...pillBtnStyle,
                  background: T.color.white,
                  color: T.color.muted,
                  border: `1px solid ${T.color.cream}`,
                  fontSize: "0.8125rem",
                  padding: "0.5rem 1.25rem",
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            ...pillBtnStyle,
            width: "100%",
            background: "transparent",
            color: T.color.muted,
            border: `1px solid ${T.color.cream}`,
            fontSize: "0.8125rem",
          }}
        >
          {t("deletePerson")}
        </button>
      )}
    </div>
  );
}

/* Default export for backward compatibility */
export default function PersonPanelActions(props: PersonPanelNavActionsProps & PersonPanelDeleteProps) {
  return (
    <>
      <PersonPanelNavActions {...props} />
      <PersonPanelDelete {...props} />
    </>
  );
}
