"use client";

import { useState, useRef, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import Image from "next/image";
import {
  addRelationship,
  removeRelationship,
} from "@/lib/auth/family-tree-actions";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";
import {
  REL_TYPES,
  SilhouetteAvatar,
  SectionCard,
  smallPillStyle,
  pillBtnStyle,
  labelStyle,
  glassBorder,
  getInputStyle,
  reverseRelType,
  relTypeLabel,
  getPersonName,
} from "./PersonPanelShared";
import type { RelType } from "./PersonPanelShared";

interface PersonPanelRelationshipsProps {
  person: FamilyTreePerson;
  allPersons: FamilyTreePerson[];
  relationships: FamilyTreeRelationship[];
  personRels: FamilyTreeRelationship[];
  derivedSiblings: FamilyTreePerson[];
  onUpdate: () => void;
  onSelectPerson?: (person: FamilyTreePerson) => void;
  isMobile: boolean;
}

export default function PersonPanelRelationships({
  person,
  allPersons,
  relationships,
  personRels,
  derivedSiblings,
  onUpdate,
  onSelectPerson,
  isMobile,
}: PersonPanelRelationshipsProps) {
  const { t } = useTranslation("familyTree");
  const inputStyle = getInputStyle(isMobile);

  const [showAddRel, setShowAddRel] = useState(false);
  const [relPersonId, setRelPersonId] = useState("");
  const [relType, setRelType] = useState<RelType>("parent");
  const [relError, setRelError] = useState("");
  const [relSearch, setRelSearch] = useState("");
  const [relDropdownOpen, setRelDropdownOpen] = useState(false);
  const [confirmRemoveRelId, setConfirmRemoveRelId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const getPersonById = (id: string) => allPersons.find((x) => x.id === id);

  const handleAddRelationship = async () => {
    if (!relPersonId) return;
    setRelError("");
    const result = await addRelationship(person.id, relPersonId, relType);
    if (result?.error) {
      setRelError(t("relationshipAddError"));
      return;
    }
    setShowAddRel(false);
    setRelPersonId("");
    setRelSearch("");
    onUpdate();
  };

  const handleRemoveRel = async (relId: string) => {
    const result = await removeRelationship(relId);
    if (result && "error" in result && result.error) {
      setRelError(result.error);
      return;
    }
    onUpdate();
  };

  const filteredPersons = useMemo(() => {
    const others = allPersons.filter((p) => p.id !== person.id);
    if (!relSearch.trim()) return others;
    const q = relSearch.toLowerCase();
    return others.filter((p) => {
      const name = `${p.first_name} ${p.last_name || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [allPersons, person.id, relSearch]);

  const relOfNameLabel = (rt: RelType): string => {
    const map: Record<string, string> = {
      parent: t("parentOfName", { name: person.first_name }),
      child: t("childOfName", { name: person.first_name }),
      spouse: t("spouseOfName", { name: person.first_name }),
      sibling: t("siblingOfName", { name: person.first_name }),
      "ex-spouse": t("exSpouseOfName", { name: person.first_name }),
      stepparent: t("relStepparentOfName", { name: person.first_name }),
      stepchild: t("relStepchildOfName", { name: person.first_name }),
      "half-sibling": t("relHalfSiblingOfName", { name: person.first_name }),
    };
    return map[rt] || rt;
  };

  const relPreviewKey = (rt: RelType): string => {
    const map: Record<string, string> = {
      parent: t("relPreviewParent"),
      child: t("relPreviewChild"),
      spouse: t("relPreviewSpouse"),
      sibling: t("relPreviewSibling"),
      "ex-spouse": t("relPreviewExSpouse"),
      stepparent: t("relPreviewStepparent"),
      stepchild: t("relPreviewStepchild"),
      "half-sibling": t("relPreviewHalfSibling"),
    };
    return map[rt] || rt;
  };

  return (
    <SectionCard>
      <h3
        style={{
          fontFamily: T.font.display,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: T.color.charcoal,
          marginBottom: "0.75rem",
          marginTop: 0,
        }}
      >
        {t("relationships")}
      </h3>

      {personRels.length === 0 ? (
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            fontStyle: "italic",
          }}
        >
          {t("noRelationships")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {personRels.map((rel) => {
            const otherId =
              rel.person_id === person.id
                ? rel.related_person_id
                : rel.person_id;
            const otherPerson = getPersonById(otherId);
            const otherName = getPersonName(otherId, allPersons, t);
            const rawLabel =
              rel.person_id === person.id
                ? rel.relationship_type
                : reverseRelType(rel.relationship_type);
            const isExSpouse = rawLabel === "ex-spouse";
            const relDescMap: Record<string, string> = {
              parent: t("relDescParent"),
              child: t("relDescChild"),
              spouse: t("relDescSpouse"),
              sibling: t("relDescSibling"),
              "ex-spouse": t("exSpouse"),
              stepparent: t("stepparent"),
              stepchild: t("stepchild"),
              "half-sibling": t("halfSibling"),
            };
            const relDesc = relDescMap[rawLabel] || rawLabel;

            return (
              <div key={rel.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.75rem",
                  background: isExSpouse
                    ? `rgba(116,107,96,0.06)`
                    : `rgba(255,255,255,0.5)`,
                  border: glassBorder,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* Small photo thumbnail in relationship row */}
                  {otherPerson && (
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "1rem",
                        border: `2px solid ${isExSpouse ? T.color.muted : T.color.walnut}`,
                        background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                        overflow: "hidden",
                        flexShrink: 0,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                        opacity: isExSpouse ? 0.6 : 1,
                      }}
                    >
                      {otherPerson.photo_path ? (
                        <Image
                          src={otherPerson.photo_path}
                          alt={otherName}
                          fill
                          sizes="32px"
                          loading="lazy"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <SilhouetteAvatar gender={otherPerson.gender} size={20} birthDate={otherPerson.birth_date} deathDate={otherPerson.death_date} />
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.0625rem",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        color: isExSpouse ? T.color.muted : T.color.walnut,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        textDecoration: isExSpouse ? "line-through" : "none",
                      }}
                    >
                      {relDesc}
                    </span>
                    <button
                      onClick={() => {
                        if (onSelectPerson && otherPerson) {
                          onSelectPerson(otherPerson);
                        }
                      }}
                      disabled={!onSelectPerson || !otherPerson}
                      style={{
                        fontFamily: T.font.display,
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: isExSpouse
                          ? T.color.muted
                          : onSelectPerson && otherPerson
                            ? T.color.terracotta
                            : T.color.charcoal,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: onSelectPerson && otherPerson ? "pointer" : "default",
                        textAlign: "left",
                        textDecoration: onSelectPerson && otherPerson ? "underline" : "none",
                        textDecorationColor: `${T.color.terracotta}40`,
                        textUnderlineOffset: "0.125rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        opacity: isExSpouse ? 0.7 : 1,
                      }}
                      title={otherName}
                    >
                      {otherName}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmRemoveRelId(rel.id)}
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "999rem",
                    border: glassBorder,
                    background: "rgba(255,255,255,0.6)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    color: T.color.muted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    minWidth: "2.75rem",
                    minHeight: "2.75rem",
                  }}
                  title={t("removeRelationship")}
                  aria-label={t("removeRelationship")}
                >
                  {"\u2715"}
                </button>
              </div>
              {confirmRemoveRelId === rel.id && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.375rem 0.75rem",
                    background: "rgba(255,255,255,0.5)",
                    borderRadius: "0.5rem",
                    border: glassBorder,
                    marginTop: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      flex: 1,
                    }}
                  >
                    {t("confirmRemoveRel")}
                  </span>
                  <button
                    onClick={() => {
                      handleRemoveRel(rel.id);
                      setConfirmRemoveRelId(null);
                    }}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#fff",
                      background: T.color.terracotta,
                      border: "none",
                      borderRadius: "0.375rem",
                      padding: "0.25rem 0.625rem",
                      cursor: "pointer",
                    }}
                  >
                    {t("confirmRemoveRelYes")}
                  </button>
                  <button
                    onClick={() => setConfirmRemoveRelId(null)}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      background: "rgba(255,255,255,0.6)",
                      border: glassBorder,
                      borderRadius: "0.375rem",
                      padding: "0.25rem 0.625rem",
                      cursor: "pointer",
                    }}
                  >
                    {t("confirmRemoveRelNo")}
                  </button>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Auto-derived siblings (Issue 4d) ── */}
      {derivedSiblings.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: T.color.muted,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "0.375rem",
            }}
          >
            {t("siblings")}
            <span
              style={{
                fontWeight: 400,
                fontStyle: "italic",
                textTransform: "none",
                marginLeft: "0.375rem",
                fontSize: "0.625rem",
              }}
            >
              ({t("siblingAutoDesc")})
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {derivedSiblings.map((sib) => {
              const sibName = `${sib.first_name}${sib.last_name ? " " + sib.last_name : ""}`;
              return (
                <div
                  key={sib.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.5rem 0.875rem",
                    borderRadius: "0.75rem",
                    background: `${T.color.sage}08`,
                    border: `1px solid ${T.color.sage}20`,
                  }}
                >
                  <div
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "0.875rem",
                      border: `2px solid ${T.color.sage}60`,
                      background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                      overflow: "hidden",
                      flexShrink: 0,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {sib.photo_path ? (
                      <Image src={sib.photo_path} alt={sibName} fill sizes="28px" loading="lazy" style={{ objectFit: "cover" }} />
                    ) : (
                      <SilhouetteAvatar gender={sib.gender} size={16} birthDate={sib.birth_date} deathDate={sib.death_date} />
                    )}
                  </div>
                  <button
                    onClick={() => onSelectPerson && onSelectPerson(sib)}
                    disabled={!onSelectPerson}
                    style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: onSelectPerson ? T.color.terracotta : T.color.charcoal,
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: onSelectPerson ? "pointer" : "default",
                      textDecoration: onSelectPerson ? "underline" : "none",
                      textDecorationColor: `${T.color.terracotta}40`,
                      textUnderlineOffset: "0.125rem",
                    }}
                  >
                    {sibName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add relationship (sentence-based UI) ── */}
      {showAddRel ? (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            background: "rgba(255,255,255,0.5)",
            border: glassBorder,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {/* Sentence builder */}
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "1rem",
              fontWeight: 600,
              color: T.color.charcoal,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: T.color.terracotta }}>{person.first_name}</span>{" "}
            <span style={{ color: T.color.muted, fontWeight: 400 }}>{t("relPreview", { person: "", relType: "", other: "" }).trim() === "" ? "is" : ""}</span>
          </div>

          {/* Pill buttons for relationship type */}
          <div>
            <label style={labelStyle}>{t("relationshipType")}</label>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {REL_TYPES.map((rt) => (
                <button
                  key={rt}
                  onClick={() => setRelType(rt)}
                  style={{
                    ...smallPillStyle,
                    background: relType === rt
                      ? rt === "ex-spouse"
                        ? T.color.muted
                        : T.color.walnut
                      : T.color.white,
                    color: relType === rt ? T.color.white : T.color.walnut,
                    borderColor: relType === rt
                      ? rt === "ex-spouse"
                        ? T.color.muted
                        : T.color.walnut
                      : T.color.sandstone,
                    fontSize: "0.75rem",
                    minHeight: "2.75rem",
                  }}
                >
                  {relTypeLabel(rt, t)}
                </button>
              ))}
            </div>
          </div>

          {/* Sentence context */}
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              fontStyle: "italic",
            }}
          >
            {relOfNameLabel(relType)}
          </div>

          {/* Search person */}
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>{t("relatedPerson")}</label>
            <input
              ref={searchRef}
              type="text"
              value={relPersonId ? getPersonName(relPersonId, allPersons, t) : relSearch}
              onChange={(e) => {
                setRelSearch(e.target.value);
                setRelPersonId("");
                setRelDropdownOpen(true);
              }}
              onFocus={() => setRelDropdownOpen(true)}
              placeholder={t("searchPerson")}
              style={inputStyle}
              autoComplete="off"
            />
            {relPersonId && (
              <button
                onClick={() => {
                  setRelPersonId("");
                  setRelSearch("");
                  searchRef.current?.focus();
                }}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "calc(0.25rem + 1.125rem + 0.625rem)",
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "999rem",
                  border: "none",
                  background: T.color.sandstone,
                  color: T.color.white,
                  fontSize: "0.625rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={t("clearSelection")}
              >
                {"\u2715"}
              </button>
            )}
            {relDropdownOpen && !relPersonId && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: "12rem",
                  overflowY: "auto",
                  background: T.color.white,
                  border: `1px solid ${T.color.sandstone}`,
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 16px rgba(44,44,42,.12)",
                  zIndex: 10,
                }}
              >
                {filteredPersons.length === 0 ? (
                  <div
                    style={{
                      padding: "0.625rem 0.875rem",
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: T.color.muted,
                      fontStyle: "italic",
                    }}
                  >
                    {t("noPersonFound")}
                  </div>
                ) : (
                  filteredPersons.map((p) => {
                    const pName = `${p.first_name}${p.last_name ? " " + p.last_name : ""}`;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setRelPersonId(p.id);
                          setRelSearch("");
                          setRelDropdownOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.625rem",
                          width: "100%",
                          padding: "0.5rem 0.875rem",
                          fontFamily: T.font.body,
                          fontSize: "0.875rem",
                          color: T.color.charcoal,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          minHeight: "2.75rem",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = T.color.warmStone;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "none";
                        }}
                      >
                        {/* Person card mini-avatar */}
                        <div
                          style={{
                            width: "1.75rem",
                            height: "1.75rem",
                            borderRadius: "0.875rem",
                            border: `2px solid ${T.color.sandstone}`,
                            background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                            overflow: "hidden",
                            flexShrink: 0,
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                          }}
                        >
                          {p.photo_path ? (
                            <Image
                              src={p.photo_path}
                              alt={pName}
                              fill
                              sizes="28px"
                              loading="lazy"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <SilhouetteAvatar gender={p.gender} size={16} birthDate={p.birth_date} deathDate={p.death_date} />
                          )}
                        </div>
                        <span>{pName}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Click-away handler for dropdown */}
          {relDropdownOpen && !relPersonId && (
            <div
              onClick={() => setRelDropdownOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 5,
              }}
            />
          )}

          {/* Relationship preview */}
          {relPersonId && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: relType === "ex-spouse"
                  ? `${T.color.muted}12`
                  : `${T.color.sage}12`,
                border: `1px solid ${relType === "ex-spouse" ? T.color.muted : T.color.sage}30`,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              {/* Preview avatars */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "1rem",
                    border: `2px solid ${T.color.walnut}`,
                    background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                  }}
                >
                  {person.photo_path ? (
                    <Image src={person.photo_path} alt={person.first_name} fill sizes="32px" loading="lazy" style={{ objectFit: "cover" }} />
                  ) : <SilhouetteAvatar gender={person.gender} size={20} birthDate={person.birth_date} deathDate={person.death_date} />}
                </div>
                <div
                  style={{
                    width: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.muted,
                  }}
                >
                  {"\u2192"}
                </div>
                {(() => {
                  const op = getPersonById(relPersonId);
                  return (
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "1rem",
                        border: `2px solid ${T.color.walnut}`,
                        background: `linear-gradient(135deg, ${T.color.warmStone}, ${T.color.sandstone})`,
                        overflow: "hidden",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                      }}
                    >
                      {op?.photo_path ? (
                        <Image src={op.photo_path} alt={getPersonName(relPersonId, allPersons, t)} fill sizes="32px" loading="lazy" style={{ objectFit: "cover" }} />
                      ) : <SilhouetteAvatar gender={op?.gender || null} size={20} birthDate={op?.birth_date} deathDate={op?.death_date} />}
                    </div>
                  );
                })()}
              </div>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.charcoal,
                  fontStyle: "italic",
                  flex: 1,
                }}
              >
                {t("relPreview", {
                  person: person.first_name,
                  relType: relPreviewKey(relType),
                  other: getPersonName(relPersonId, allPersons, t),
                })}
              </div>
            </div>
          )}

          {relError && (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.error,
              }}
            >
              {relError}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              onClick={handleAddRelationship}
              disabled={!relPersonId}
              style={{
                ...pillBtnStyle,
                background: relPersonId ? T.color.terracotta : T.color.sandstone,
                color: T.color.white,
                flex: 1,
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
              }}
            >
              {t("add")}
            </button>
            <button
              onClick={() => {
                setShowAddRel(false);
                setRelSearch("");
                setRelPersonId("");
                setRelError("");
              }}
              style={{
                ...pillBtnStyle,
                background: T.color.white,
                color: T.color.muted,
                border: `1px solid ${T.color.cream}`,
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
              }}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddRel(true)}
          style={{
            ...pillBtnStyle,
            width: "100%",
            marginTop: "0.75rem",
            background: "rgba(255,255,255,0.5)",
            color: T.color.sage,
            border: `1px solid ${T.color.sage}40`,
            fontSize: "0.8125rem",
          }}
        >
          {t("addRelationship")}
        </button>
      )}
    </SectionCard>
  );
}
