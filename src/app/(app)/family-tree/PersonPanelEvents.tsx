"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  getEvents,
  addEvent,
  updateEvent,
  removeEvent,
} from "@/lib/auth/family-tree-actions";
import type {
  FamilyTreeEvent,
  FamilyTreeEventType,
} from "@/lib/auth/family-tree-actions";
import {
  Spinner,
  SectionCard,
  smallPillStyle,
  pillBtnStyle,
  labelStyle,
  glassBorder,
  getInputStyle,
  formatDateHuman,
  EVENT_TYPES,
  EVENT_ICONS,
} from "./PersonPanelShared";
import { DateInputAssisted } from "./DateInputAssisted";

interface PersonPanelEventsProps {
  personId: string;
  isMobile: boolean;
  locale: string;
}

export default function PersonPanelEvents({
  personId,
  isMobile,
  locale,
}: PersonPanelEventsProps) {
  const { t } = useTranslation("familyTree");
  const inputStyle = getInputStyle(isMobile);

  const [events, setEvents] = useState<FamilyTreeEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<FamilyTreeEventType>("marriage");
  const [eventDate, setEventDate] = useState("");
  const [eventPlace, setEventPlace] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventError, setEventError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [confirmRemoveEventId, setConfirmRemoveEventId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { events: allEvents } = await getEvents();
      setEvents(allEvents.filter((e) => e.person_id === personId));
    } catch {
      setEvents([]);
    }
    setEventsLoading(false);
  }, [personId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const personEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (!a.event_date && !b.event_date) return 0;
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return a.event_date.localeCompare(b.event_date);
    });
  }, [events]);

  const eventTypeLabel = (et: FamilyTreeEventType): string => {
    const map: Record<FamilyTreeEventType, string> = {
      marriage: t("eventMarriage"), divorce: t("eventDivorce"),
      burial: t("eventBurial"), baptism: t("eventBaptism"),
      christening: t("eventChristening"), immigration: t("eventImmigration"),
      emigration: t("eventEmigration"), naturalization: t("eventNaturalization"),
      occupation: t("eventOccupation"), education: t("eventEducation"),
      military: t("eventMilitary"), residence: t("eventResidence"),
      retirement: t("eventRetirement"), census: t("eventCensus"),
      other: t("eventOther"),
    };
    return map[et] || et;
  };

  const resetEventForm = () => {
    setEventType("marriage");
    setEventDate("");
    setEventPlace("");
    setEventDesc("");
    setEventError("");
    setEditingEventId(null);
  };

  const handleSaveEvent = async () => {
    setSavingEvent(true);
    setEventError("");
    try {
      if (editingEventId) {
        const result = await updateEvent(editingEventId, {
          event_type: eventType,
          event_date: eventDate || null,
          event_place: eventPlace || null,
          description: eventDesc || null,
        });
        if (result && "error" in result && result.error) {
          setEventError(t("eventSaveError"));
          setSavingEvent(false);
          return;
        }
      } else {
        const result = await addEvent(personId, {
          event_type: eventType,
          event_date: eventDate || undefined,
          event_place: eventPlace || undefined,
          description: eventDesc || undefined,
        });
        if (result && "error" in result && result.error) {
          setEventError(t("eventSaveError"));
          setSavingEvent(false);
          return;
        }
      }
      resetEventForm();
      setShowAddEvent(false);
      await loadEvents();
    } catch {
      setEventError(t("eventSaveError"));
    }
    setSavingEvent(false);
  };

  const handleRemoveEvent = async (id: string) => {
    const result = await removeEvent(id);
    if (result && "error" in result && result.error) {
      setEventError(result.error);
      return;
    }
    setConfirmRemoveEventId(null);
    await loadEvents();
  };

  const startEditEvent = (evt: FamilyTreeEvent) => {
    setEditingEventId(evt.id);
    setEventType(evt.event_type);
    setEventDate(evt.event_date || "");
    setEventPlace(evt.event_place || "");
    setEventDesc(evt.description || "");
    setShowAddEvent(true);
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
        {t("eventsTitle")}
      </h3>

      {eventsLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "1rem 0" }}>
          <Spinner size="1.25rem" color={T.color.walnut} />
        </div>
      ) : personEvents.length === 0 && !showAddEvent ? (
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            fontStyle: "italic",
          }}
        >
          {t("noEvents")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {personEvents.map((evt) => (
            <div key={evt.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.625rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.75rem",
                  background: "rgba(255,255,255,0.5)",
                  border: glassBorder,
                }}
              >
                {/* Event icon */}
                <span
                  style={{
                    lineHeight: 0,
                    flexShrink: 0,
                    marginTop: "0.125rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-hidden="true"
                >
                  {(() => {
                    const Icon = EVENT_ICONS[evt.event_type] || EVENT_ICONS.other;
                    return <Icon size={18} color={T.color.walnut} />;
                  })()}
                </span>

                {/* Event details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      color: T.color.walnut,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {eventTypeLabel(evt.event_type)}
                  </div>
                  {evt.event_date && (
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: T.color.charcoal,
                        marginTop: "0.125rem",
                      }}
                    >
                      {formatDateHuman(evt.event_date, locale)}
                    </div>
                  )}
                  {evt.event_place && (
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: T.color.muted,
                        marginTop: "0.0625rem",
                      }}
                    >
                      {evt.event_place}
                    </div>
                  )}
                  {evt.description && (
                    <div
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: T.color.charcoal,
                        marginTop: "0.25rem",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {evt.description}
                    </div>
                  )}
                </div>

                {/* Edit / Remove buttons */}
                <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                  <button
                    onClick={() => startEditEvent(evt)}
                    style={{
                      width: "2.75rem",
                      height: "2.75rem",
                      borderRadius: "999rem",
                      border: glassBorder,
                      background: "rgba(255,255,255,0.6)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      color: T.color.walnut,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "2.75rem",
                      minHeight: "2.75rem",
                    }}
                    title={t("editEvent")}
                    aria-label={t("editEvent")}
                  >
                    {"\u270E"}
                  </button>
                  <button
                    onClick={() => setConfirmRemoveEventId(evt.id)}
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
                      minWidth: "2.75rem",
                      minHeight: "2.75rem",
                    }}
                    title={t("removeEvent")}
                    aria-label={t("removeEvent")}
                  >
                    {"\u2715"}
                  </button>
                </div>
              </div>

              {/* Confirm remove */}
              {confirmRemoveEventId === evt.id && (
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
                    {t("confirmRemoveEvent")}
                  </span>
                  <button
                    onClick={() => handleRemoveEvent(evt.id)}
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
                      minHeight: "2.75rem",
                    }}
                  >
                    {t("confirmRemoveRelYes")}
                  </button>
                  <button
                    onClick={() => setConfirmRemoveEventId(null)}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      background: "rgba(255,255,255,0.6)",
                      border: glassBorder,
                      borderRadius: "0.375rem",
                      padding: "0.25rem 0.625rem",
                      cursor: "pointer",
                      minHeight: "2.75rem",
                    }}
                  >
                    {t("confirmRemoveRelNo")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit event form */}
      {showAddEvent ? (
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
          {/* Event type pills */}
          <div>
            <label style={labelStyle}>{t("eventType")}</label>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {EVENT_TYPES.map((et) => (
                <button
                  key={et}
                  onClick={() => setEventType(et)}
                  style={{
                    ...smallPillStyle,
                    background: eventType === et ? T.color.walnut : T.color.white,
                    color: eventType === et ? T.color.white : T.color.walnut,
                    borderColor: eventType === et ? T.color.walnut : T.color.sandstone,
                    fontSize: "0.75rem",
                    padding: "0.375rem 0.75rem",
                  }}
                >
                  <span style={{ marginRight: "0.25rem", display: "inline-flex", verticalAlign: "middle" }}>
                    {(() => {
                      const Icon = EVENT_ICONS[et];
                      return <Icon size={14} color={eventType === et ? T.color.white : T.color.walnut} />;
                    })()}
                  </span>
                  {eventTypeLabel(et)}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>{t("eventDate")}</label>
            <DateInputAssisted
              value={eventDate}
              onChange={(v) => setEventDate(v)}
              isMobile={isMobile}
              style={{
                borderRadius: "0.625rem",
                minHeight: isMobile ? "3rem" : "2.75rem",
              }}
            />
          </div>

          {/* Place */}
          <div>
            <label style={labelStyle}>{t("eventPlace")}</label>
            <input
              type="text"
              value={eventPlace}
              onChange={(e) => setEventPlace(e.target.value)}
              placeholder={t("eventPlacePlaceholder")}
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>{t("eventDescription")}</label>
            <textarea
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              rows={2}
              placeholder={t("eventDescPlaceholder")}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "3rem",
                borderRadius: "0.75rem",
              }}
            />
          </div>

          {eventError && (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.75rem",
                color: T.color.error,
              }}
            >
              {eventError}
            </div>
          )}

          {/* Save / Cancel */}
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              onClick={handleSaveEvent}
              disabled={savingEvent}
              style={{
                ...pillBtnStyle,
                background: T.color.terracotta,
                color: T.color.white,
                flex: 1,
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
              }}
            >
              {savingEvent ? (
                <>
                  <Spinner size="0.875rem" color={T.color.white} />{" "}
                  <span style={{ marginLeft: "0.375rem" }}>{t("saving")}</span>
                </>
              ) : (
                t("save")
              )}
            </button>
            <button
              onClick={() => {
                setShowAddEvent(false);
                resetEventForm();
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
          onClick={() => {
            resetEventForm();
            setShowAddEvent(true);
          }}
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
          {t("addEvent")}
        </button>
      )}
    </SectionCard>
  );
}
