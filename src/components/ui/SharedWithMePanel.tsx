"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { getAcceptedShares } from "@/lib/auth/invite-actions";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { Sheet } from "@/components/ui/Sheet";
import { WingIcon, RoomIcon, GenericRoomIcon, resolveRoomIconId } from "@/components/ui/WingRoomIcons";

interface WingSubRoom {
  id: string;
  name: string;
  /** Raw local room id ("ro1") — only used to resolve the crafted SVG icon. */
  localId?: string;
  icon: string;
  memoryCount: number;
}

interface AcceptedShare {
  id: string;
  type: "wing" | "room";
  roomId?: string;
  wingId?: string;
  permission: string;
  acceptedAt: string;
  ownerName: string;
  ownerAvatar: string | null;
  roomName?: string;
  roomLocalId?: string;
  roomIcon?: string;
  wingName: string;
  wingIcon: string;
  memoryCount?: number;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  placedInWingId?: string;
  rooms?: WingSubRoom[];
}

/** Inline crafted SVG wing glyph (replaces the legacy emoji wingIcon). */
function InlineWingGlyph({ wingId, size = 15 }: { wingId?: string; size?: number }) {
  if (!wingId) return null;
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", verticalAlign: "-0.1875rem", marginRight: "0.25rem" }}>
      <WingIcon wingId={wingId} size={size} color="#716A5E" />
    </span>
  );
}

/** Inline crafted SVG room glyph — resolved from the room's local id / stored
 *  icon, generic door-arch fallback. Never emoji. */
function InlineRoomGlyph({ localId, icon, wingId, size = 15 }: { localId?: string; icon?: string; wingId?: string; size?: number }) {
  const iconId = resolveRoomIconId(localId || "", icon);
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", verticalAlign: "-0.1875rem", marginRight: "0.25rem" }}>
      {iconId
        ? <RoomIcon roomId={iconId} wingId={wingId} size={size} color="#716A5E" />
        : <GenericRoomIcon size={size} color="#716A5E" />}
    </span>
  );
}

interface SharedWithMePanelProps {
  onClose: () => void;
  onNavigateToRoom?: (roomId: string, wingId?: string) => void;
}

export default function SharedWithMePanel({ onClose, onNavigateToRoom }: SharedWithMePanelProps) {
  const { t } = useTranslation("sharedWithMe");
  const [shares, setShares] = useState<AcceptedShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getAcceptedShares()
      .then(result => {
        if (cancelled) return;
        setShares((result.shares as AcceptedShare[]) || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Group by owner
  const grouped = shares.reduce<Record<string, { ownerName: string; ownerAvatar: string | null; rooms: AcceptedShare[] }>>((acc, share) => {
    if (!acc[share.ownerName]) {
      acc[share.ownerName] = { ownerName: share.ownerName, ownerAvatar: share.ownerAvatar, rooms: [] };
    }
    acc[share.ownerName].rooms.push(share);
    return acc;
  }, {});

  return (
    <Sheet open onClose={onClose} title={t("title")} side="right" maxWidth="30rem">
      <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */, margin: "-0.5rem 0 1.5rem" }}>
        {shares.length > 0 ? t("roomCount", { count: String(shares.length) }) : t("noRooms")}
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: "#716A5E" /* Atrium token: muted */, fontFamily: T.font.body, fontSize: "0.8125rem" }}>
          {t("loading")}
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x26A0;&#xFE0F;</div>
          <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36" /* Atrium token: ink */, margin: "0 0 1rem", lineHeight: 1.4 }}>
            {t("loadError")}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError(false);
              getAcceptedShares()
                .then(result => setShares((result.shares as AcceptedShare[]) || []))
                .catch(() => setError(true))
                .finally(() => setLoading(false));
            }}
            style={{
              padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "none",
              background: "#B85C38" /* Atrium token: ember */, color: T.color.white,
              fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
              minHeight: "2.75rem",
            }}
          >
            {t("retry")}
          </button>
        </div>
      ) : shares.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>&#x1F3DB;&#xFE0F;</div>
          <p style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */, margin: "0 0 0.5rem" }}>
            {t("noRooms")}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */, margin: 0, lineHeight: 1.4 }}>
            {t("emptyDesc")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {Object.values(grouped).map(group => {
            const initial = group.ownerName.charAt(0).toUpperCase();

            return (
              <div key={group.ownerName}>
                {/* Owner header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.625rem" }}>
                  <div style={{
                    width: "2rem", height: "2rem", borderRadius: "1rem",
                    background: "rgba(154,79,42,0.11)" /* Atrium token: terracotta medallion */,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600,
                    color: "#9A4F2A" /* Atrium token: terracotta glyph */, flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  <div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                      {t("roomsShared", { count: String(group.rooms.length) })}
                    </div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                      {t("sharedBy", { name: group.ownerName })}
                    </div>
                  </div>
                </div>

                {/* Share cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "2.625rem" }}>
                  {group.rooms.map(share => (
                    share.type === "wing" ? (
                      <div
                        key={share.id}
                        style={{
                          padding: "0.875rem 1rem", background: T.color.white, borderRadius: "0.75rem",
                          border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */,
                          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" /* Atrium token: S1 */,
                        }}
                      >
                        {/* Wing header */}
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: (share.rooms && share.rooms.length > 0) ? "0.625rem" : 0, alignItems: "center" }}>
                          <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                            <InlineWingGlyph wingId={share.wingId} /> {share.wingName}
                          </div>
                          <span style={{
                            padding: "0.0625rem 0.375rem", borderRadius: "2rem",
                            background: share.permission === "contribute" ? "rgba(86,104,60,0.16)" /* Atrium token: sage medallion */ : "rgba(113,106,94,0.12)",
                            fontFamily: T.font.body, fontSize: "0.8125rem",
                            color: share.permission === "contribute" ? "#56683C" /* Atrium token: sage */ : "#716A5E" /* Atrium token: muted */,
                          }}>
                            {share.permission === "contribute" ? t("permContribute") : t("permView")}
                          </span>
                        </div>
                        {/* Sub-rooms */}
                        {share.rooms && share.rooms.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            {share.rooms.map(room => (
                              <button
                                key={room.id}
                                onClick={() => onNavigateToRoom?.(room.id, share.wingId)}
                                style={{
                                  padding: "0.5rem 0.75rem", background: T.color.cream, borderRadius: "0.5rem",
                                  border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  textAlign: "left", transition: "background 0.2s ease", minHeight: "2.75rem",
                                }}
                              >
                                <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36" /* Atrium token: ink */ }}>
                                  <InlineRoomGlyph localId={room.localId} icon={room.icon} wingId={share.wingId} /> {room.name}
                                </span>
                                <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                  <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                                    {t("memories", { count: String(room.memoryCount ?? 0) })}
                                  </span>
                                  <span style={{ fontSize: "0.9375rem", color: "#716A5E" /* Atrium token: muted */ }}>&#x2192;</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                            {t("emptyWing")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        key={share.id}
                        onClick={() => share.roomId && onNavigateToRoom?.(share.roomId, share.placedInWingId ?? share.wingId)}
                        style={{
                          padding: "0.875rem 1rem", background: T.color.white, borderRadius: "0.75rem",
                          border: "0.0625rem solid #E3D6BC" /* Atrium token: hairline */, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          textAlign: "left", transition: "all 0.2s ease", minHeight: "2.75rem",
                          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)" /* Atrium token: S1 */,
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                            <InlineRoomGlyph localId={share.roomLocalId} icon={share.roomIcon} wingId={share.wingId} /> {share.roomName}
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
                            {share.wingName && (
                              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                                <InlineWingGlyph wingId={share.wingId} size={13} /> {share.wingName}
                              </span>
                            )}
                            <span style={{
                              padding: "0.0625rem 0.375rem", borderRadius: "2rem",
                              background: share.permission === "contribute" ? "rgba(86,104,60,0.16)" /* Atrium token: sage medallion */ : "rgba(113,106,94,0.12)",
                              fontFamily: T.font.body, fontSize: "0.8125rem",
                              color: share.permission === "contribute" ? "#56683C" /* Atrium token: sage */ : "#716A5E" /* Atrium token: muted */,
                            }}>
                              {share.permission === "contribute" ? t("permContribute") : t("permView")}
                            </span>
                            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted */ }}>
                              {t("memories", { count: String(share.memoryCount ?? 0) })}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.9375rem", color: "#716A5E" /* Atrium token: muted */ }}>&#x2192;</span>
                      </button>
                    )
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
