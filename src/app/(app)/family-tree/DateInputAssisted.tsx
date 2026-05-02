"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface DateInputAssistedProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isMobile?: boolean;
  style?: React.CSSProperties;
}

/** Auto-format raw digits (e.g. "19451231" → "1945-12-31") */
function autoFormatDate(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (digits.length === 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
  }
  return raw;
}

/** Strip qualifier prefix from a date string */
function stripQualifier(v: string): { qualifier: string; date: string } {
  const match = v.match(/^([~<>])\s*/);
  if (match) return { qualifier: match[1], date: v.slice(match[0].length) };
  return { qualifier: "", date: v };
}

/** Parse year from a date value, or return default */
function parseYearFromValue(v: string, defaultYear: number): number {
  const { date } = stripQualifier(v);
  const m = date.match(/^(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return defaultYear;
}

/** Parse month from a date value (0-11), or return 0 */
function parseMonthFromValue(v: string): number {
  const { date } = stripQualifier(v);
  const m = date.match(/^\d{4}-(\d{2})/);
  if (m) return parseInt(m[1], 10) - 1;
  return 0;
}

/** Get days in a given month/year */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Get day of week for the 1st of month (0=Sun, adjusted to Mon=0) */
function firstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
}

const MONTH_ABBR: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  nl: ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"],
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  fr: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"],
};
const DAY_HEADERS: Record<string, string[]> = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  nl: ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"],
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  es: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"],
  fr: ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
};

export function DateInputAssisted({
  id,
  value,
  onChange,
  placeholder,
  isMobile = false,
  style,
}: DateInputAssistedProps) {
  const { t, locale } = useTranslation("familyTree");
  const [showHelper, setShowHelper] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Calendar state
  const defaultYear = 1900;
  const [calYear, setCalYear] = useState(() => parseYearFromValue(value, defaultYear));
  const [calMonth, setCalMonth] = useState(() => parseMonthFromValue(value));

  // Sync calendar state when value changes externally
  useEffect(() => {
    if (value) {
      const y = parseYearFromValue(value, defaultYear);
      const m = parseMonthFromValue(value);
      setCalYear(y);
      setCalMonth(m);
    }
  }, [value]);

  // Close helper when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowHelper(false);
        setShowCalendar(false);
      }
    }
    if (showHelper || showCalendar) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showHelper, showCalendar]);

  const monthAbbr = MONTH_ABBR[locale] || MONTH_ABBR.en;
  const dayHeaders = DAY_HEADERS[locale] || DAY_HEADERS.en;

  // Parse current value to highlight selected day
  const parsedDate = useMemo(() => {
    const { date } = stripQualifier(value);
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1, day: parseInt(m[3], 10) };
    return null;
  }, [value]);

  const today = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, []);

  const totalDays = daysInMonth(calYear, calMonth);
  const startDay = firstDayOfWeek(calYear, calMonth);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: isMobile ? "0.75rem 0.875rem" : "0.625rem 0.875rem",
    borderRadius: "0.625rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: isMobile ? "1rem" : "0.875rem",
    color: T.color.charcoal,
    outline: "none",
    boxSizing: "border-box" as const,
    minHeight: "2.75rem",
    ...style,
  };

  const chipStyle: React.CSSProperties = {
    padding: "0.25rem 0.625rem",
    borderRadius: "1rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.6875rem",
    color: T.color.walnut,
    cursor: "pointer",
    minHeight: "2rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  };

  const handleBlur = () => {
    // Auto-format on blur
    if (value) {
      const { qualifier, date } = stripQualifier(value);
      const formatted = autoFormatDate(date);
      if (formatted !== date) {
        onChange(qualifier ? `${qualifier}${formatted}` : formatted);
      }
    }
    // Delay hiding to allow button clicks
    setTimeout(() => setShowHelper(false), 200);
  };

  const handleQualifier = (q: string) => {
    const { date } = stripQualifier(value);
    if (value.startsWith(q)) {
      // Toggle off
      onChange(date);
    } else {
      onChange(`${q}${date}`);
    }
  };

  const handleDecade = (decade: string) => {
    const { qualifier } = stripQualifier(value);
    onChange(qualifier ? `${qualifier}${decade}` : decade);
  };

  const handleFormatHint = (format: string) => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    let example = "";
    if (format === "YYYY") example = year;
    else if (format === "YYYY-MM") example = `${year}-${month}`;
    else example = `${year}-${month}-${day}`;

    const { qualifier } = stripQualifier(value);
    onChange(qualifier ? `${qualifier}${example}` : example);
    setShowHelper(false);
  };

  // Calendar actions
  const handleDayClick = (day: number) => {
    const { qualifier } = stripQualifier(value);
    const mm = String(calMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${calYear}-${mm}-${dd}`;
    onChange(qualifier ? `${qualifier}${dateStr}` : dateStr);
    setShowCalendar(false);
  };

  const handleYearOnly = () => {
    const { qualifier } = stripQualifier(value);
    const dateStr = `${calYear}`;
    onChange(qualifier ? `${qualifier}${dateStr}` : dateStr);
    setShowCalendar(false);
  };

  const handleYearMonthOnly = () => {
    const { qualifier } = stripQualifier(value);
    const mm = String(calMonth + 1).padStart(2, "0");
    const dateStr = `${calYear}-${mm}`;
    onChange(qualifier ? `${qualifier}${dateStr}` : dateStr);
    setShowCalendar(false);
  };

  const { qualifier } = stripQualifier(value);

  // Shared calendar nav button style
  const navBtnStyle: React.CSSProperties = {
    width: "2.75rem",
    height: "2.75rem",
    minWidth: "2.75rem",
    minHeight: "2.75rem",
    borderRadius: "0.5rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.875rem",
    fontWeight: 600,
    color: T.color.walnut,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    padding: 0,
  };

  const partialBtnStyle: React.CSSProperties = {
    padding: "0.375rem 0.75rem",
    borderRadius: "0.5rem",
    border: `1px solid ${T.color.sandstone}`,
    background: T.color.white,
    fontFamily: T.font.body,
    fontSize: "0.75rem",
    fontWeight: 500,
    color: T.color.walnut,
    cursor: "pointer",
    minHeight: "2rem",
    transition: "all 0.15s ease",
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: "0.375rem", alignItems: "stretch" }}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowHelper(true)}
          onBlur={handleBlur}
          placeholder={placeholder || t("datePlaceholder")}
          style={{ ...inputStyle, flex: 1 }}
        />
        {/* Calendar picker toggle */}
        <button
          type="button"
          onClick={() => {
            setShowCalendar(!showCalendar);
            if (!showCalendar) setShowHelper(false);
          }}
          title={t("dateCalendar")}
          style={{
            width: "2.75rem",
            minHeight: "2.75rem",
            borderRadius: "0.625rem",
            border: `1px solid ${showCalendar ? T.color.terracotta : T.color.sandstone}`,
            background: showCalendar ? `${T.color.terracotta}10` : T.color.white,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showCalendar ? T.color.terracotta : T.color.walnut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {/* Custom year-first calendar picker */}
      {showCalendar && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "0.25rem",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            background: T.color.white,
            border: `1px solid ${T.color.cream}`,
            boxShadow: "0 0.25rem 1.5rem rgba(44,44,42,.15)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {/* ── Year selector ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", justifyContent: "center" }}>
            <button type="button" onClick={() => setCalYear((y) => y - 100)} style={navBtnStyle} title="-100">
              {"<<"}
            </button>
            <button type="button" onClick={() => setCalYear((y) => y - 1)} style={navBtnStyle} title="-1">
              {"<"}
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={calYear}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9-]/g, "");
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 0 && n <= 9999) setCalYear(n);
                else if (v === "" || v === "-") setCalYear(0);
              }}
              style={{
                width: "4.5rem",
                textAlign: "center",
                padding: "0.375rem 0.25rem",
                borderRadius: "0.5rem",
                border: `1px solid ${T.color.sandstone}`,
                background: T.color.white,
                fontFamily: T.font.body,
                fontSize: "1rem",
                fontWeight: 700,
                color: T.color.charcoal,
                outline: "none",
                minHeight: "2.75rem",
                boxSizing: "border-box" as const,
              }}
            />
            <button type="button" onClick={() => setCalYear((y) => y + 1)} style={navBtnStyle} title="+1">
              {">"}
            </button>
            <button type="button" onClick={() => setCalYear((y) => y + 100)} style={navBtnStyle} title="+100">
              {">>"}
            </button>
          </div>

          {/* ── Month grid (3×4) ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.25rem",
            }}
          >
            {monthAbbr.map((name, i) => {
              const isSelected = calMonth === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCalMonth(i)}
                  style={{
                    padding: "0.25rem 0",
                    borderRadius: "0.375rem",
                    border: isSelected ? `1px solid ${T.color.terracotta}` : `1px solid transparent`,
                    background: isSelected ? `${T.color.terracotta}15` : "transparent",
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    fontVariant: "all-small-caps",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? T.color.terracotta : T.color.walnut,
                    cursor: "pointer",
                    minHeight: "2rem",
                    transition: "all 0.12s ease",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* ── Day grid ── */}
          <div>
            {/* Day-of-week headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.125rem",
                marginBottom: "0.125rem",
              }}
            >
              {dayHeaders.map((dh, i) => (
                <div
                  key={dh}
                  style={{
                    textAlign: "center",
                    fontFamily: T.font.body,
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    color: i >= 5 ? T.color.muted : T.color.walnut,
                    padding: "0.125rem 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.02rem",
                  }}
                >
                  {dh}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.125rem",
              }}
            >
              {/* Empty cells for offset */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {/* Actual day buttons */}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const dayOfWeek = (startDay + i) % 7;
                const isWeekend = dayOfWeek >= 5;
                const isSelected =
                  parsedDate &&
                  parsedDate.year === calYear &&
                  parsedDate.month === calMonth &&
                  parsedDate.day === day;
                const isToday =
                  today.year === calYear &&
                  today.month === calMonth &&
                  today.day === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      border: isToday && !isSelected ? `1px solid ${T.color.terracotta}` : "1px solid transparent",
                      background: isSelected ? T.color.terracotta : "transparent",
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected
                        ? T.color.white
                        : isWeekend
                          ? T.color.muted
                          : T.color.charcoal,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.1s ease",
                      padding: 0,
                      margin: "0 auto",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Partial date buttons ── */}
          <div style={{ display: "flex", gap: "0.375rem", justifyContent: "center", marginTop: "0.25rem" }}>
            <button type="button" onClick={handleYearOnly} style={partialBtnStyle}>
              {t("dateYearOnly")}
            </button>
            <button type="button" onClick={handleYearMonthOnly} style={partialBtnStyle}>
              {t("dateYearMonth")}
            </button>
          </div>
        </div>
      )}

      {/* Format hint below */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.625rem",
          color: T.color.muted,
          marginTop: "0.125rem",
          paddingLeft: "0.25rem",
        }}
      >
        {t("dateFormatHint")}
      </div>

      {/* Qualifier buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginTop: "0.25rem",
          flexWrap: "wrap",
        }}
      >
        {[
          { symbol: "~", label: t("dateApproximate") },
          { symbol: "<", label: t("dateBefore") },
          { symbol: ">", label: t("dateAfter") },
        ].map((q) => (
          <button
            key={q.symbol}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleQualifier(q.symbol)}
            style={{
              ...chipStyle,
              background: qualifier === q.symbol ? `${T.color.terracotta}18` : T.color.white,
              borderColor: qualifier === q.symbol ? T.color.terracotta : T.color.sandstone,
              color: qualifier === q.symbol ? T.color.terracotta : T.color.walnut,
              fontWeight: qualifier === q.symbol ? 600 : 500,
            }}
            title={q.label}
          >
            <span style={{ fontWeight: 700, marginRight: "0.25rem" }}>{q.symbol}</span>
            {q.label}
          </button>
        ))}
      </div>

      {/* Helper dropdown on focus */}
      {showHelper && !showCalendar && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "0.25rem",
            padding: "0.5rem",
            borderRadius: "0.625rem",
            background: T.color.white,
            border: `1px solid ${T.color.cream}`,
            boxShadow: `0 0.25rem 1rem rgba(44,44,42,.12)`,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
          }}
        >
          {/* Format hints */}
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              color: T.color.muted,
              textTransform: "uppercase",
              letterSpacing: "0.03rem",
              marginBottom: "0.125rem",
            }}
          >
            {t("dateFormats")}
          </div>
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            {["YYYY", "YYYY-MM", "YYYY-MM-DD"].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatHint(fmt)}
                style={{
                  ...chipStyle,
                  fontSize: "0.625rem",
                  padding: "0.1875rem 0.5rem",
                  minHeight: "1.75rem",
                }}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Decade quick buttons */}
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              color: T.color.muted,
              textTransform: "uppercase",
              letterSpacing: "0.03rem",
              marginTop: "0.125rem",
            }}
          >
            {t("dateDecade")}
          </div>
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            {["1800", "1850", "1900", "1950", "2000"].map((decade) => (
              <button
                key={decade}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleDecade(decade)}
                style={{
                  ...chipStyle,
                  fontSize: "0.625rem",
                  padding: "0.1875rem 0.5rem",
                  minHeight: "1.75rem",
                }}
              >
                {decade}s
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
