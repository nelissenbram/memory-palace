"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "./TuscanCard";

/* ═══════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════ */

type Dimension = "preserve" | "narrate" | "organize" | "discover";
type Scores = Record<Dimension, number>;

const DIMENSIONS: Dimension[] = ["preserve", "narrate", "organize", "discover"];

const PERSONAS = [
  { id: "historian", labelKey: "historianLabel", descKey: "historianDesc", dims: ["preserve", "narrate"] as Dimension[] },
  { id: "storyteller", labelKey: "storytellerLabel", descKey: "storytellerDesc", dims: ["narrate", "discover"] as Dimension[] },
  { id: "curator", labelKey: "curatorLabel", descKey: "curatorDesc", dims: ["organize", "preserve"] as Dimension[] },
  { id: "explorer", labelKey: "explorerLabel", descKey: "explorerDesc", dims: ["discover", "organize"] as Dimension[] },
] as const;

interface QuizAnswer {
  labelKey: string;
  primary: Dimension;
  primaryPts: number;
  secondary: Dimension;
  secondaryPts: number;
}

interface QuizQuestion {
  textKey: string;
  answers: QuizAnswer[];
}

const QUIZ: QuizQuestion[] = [
  {
    textKey: "q1",
    answers: [
      { labelKey: "q1a", primary: "preserve", primaryPts: 2, secondary: "narrate", secondaryPts: 1 },
      { labelKey: "q1b", primary: "narrate", primaryPts: 2, secondary: "discover", secondaryPts: 1 },
      { labelKey: "q1c", primary: "organize", primaryPts: 2, secondary: "preserve", secondaryPts: 1 },
      { labelKey: "q1d", primary: "discover", primaryPts: 2, secondary: "organize", secondaryPts: 1 },
    ],
  },
  {
    textKey: "q2",
    answers: [
      { labelKey: "q2a", primary: "preserve", primaryPts: 2, secondary: "organize", secondaryPts: 1 },
      { labelKey: "q2b", primary: "narrate", primaryPts: 2, secondary: "preserve", secondaryPts: 1 },
      { labelKey: "q2c", primary: "organize", primaryPts: 2, secondary: "discover", secondaryPts: 1 },
      { labelKey: "q2d", primary: "discover", primaryPts: 2, secondary: "narrate", secondaryPts: 1 },
    ],
  },
  {
    textKey: "q3",
    answers: [
      { labelKey: "q3a", primary: "preserve", primaryPts: 2, secondary: "narrate", secondaryPts: 1 },
      { labelKey: "q3b", primary: "narrate", primaryPts: 2, secondary: "organize", secondaryPts: 1 },
      { labelKey: "q3c", primary: "organize", primaryPts: 2, secondary: "preserve", secondaryPts: 1 },
      { labelKey: "q3d", primary: "discover", primaryPts: 2, secondary: "narrate", secondaryPts: 1 },
    ],
  },
  {
    textKey: "q4",
    answers: [
      { labelKey: "q4a", primary: "preserve", primaryPts: 2, secondary: "discover", secondaryPts: 1 },
      { labelKey: "q4b", primary: "narrate", primaryPts: 2, secondary: "preserve", secondaryPts: 1 },
      { labelKey: "q4c", primary: "organize", primaryPts: 2, secondary: "narrate", secondaryPts: 1 },
      { labelKey: "q4d", primary: "discover", primaryPts: 2, secondary: "organize", secondaryPts: 1 },
    ],
  },
  {
    textKey: "q5",
    answers: [
      { labelKey: "q5a", primary: "preserve", primaryPts: 2, secondary: "organize", secondaryPts: 1 },
      { labelKey: "q5b", primary: "narrate", primaryPts: 2, secondary: "discover", secondaryPts: 1 },
      { labelKey: "q5c", primary: "organize", primaryPts: 2, secondary: "narrate", secondaryPts: 1 },
      { labelKey: "q5d", primary: "discover", primaryPts: 2, secondary: "preserve", secondaryPts: 1 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════ */

function PersonaIcon({ id, size = 28, color }: { id: string; size?: number; color: string }) {
  const s = {
    width: `${size / 16}rem`,
    height: `${size / 16}rem`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "historian":
      return (
        <svg {...s}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="12" y2="17" />
        </svg>
      );
    case "storyteller":
      return (
        <svg {...s}>
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
      );
    case "curator":
      return (
        <svg {...s}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "explorer":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={`${color}30`} stroke={color} />
        </svg>
      );
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const EMPTY_SCORES: Scores = { preserve: 0, narrate: 0, organize: 0, discover: 0 };

function calcPersona(scores: Scores): string {
  // Each persona has 2 primary dimensions; sum the pair scores
  let bestId = "historian";
  let bestScore = -1;
  for (const p of PERSONAS) {
    const score = scores[p.dims[0]] + scores[p.dims[1]];
    if (score > bestScore) {
      bestScore = score;
      bestId = p.id;
    }
  }
  return bestId;
}

function maxScore(scores: Scores): number {
  return Math.max(...DIMENSIONS.map((d) => scores[d]), 1);
}

/* ═══════════════════════════════════════════════════════════
   DIMENSION LABEL KEYS
   ═══════════════════════════════════════════════════════════ */

const DIM_LABEL_KEY: Record<Dimension, string> = {
  preserve: "dimPreserve",
  narrate: "dimNarrate",
  organize: "dimOrganize",
  discover: "dimDiscover",
};

const DIM_COLOR: Record<Dimension, string> = {
  preserve: "#8A6410", // Atrium token: ochre glyph
  narrate: "#B85C38", // Atrium token: ember
  organize: "#56683C", // Atrium token: sage
  discover: "#9A4F2A", // Atrium token: terracotta glyph
};

/* ═══════════════════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════════════════ */

interface PersonaSelectorProps {
  onPersonaSelected: (persona: string) => void;
  currentPersona: string | null;
  isMobile: boolean;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function PersonaSelector({
  onPersonaSelected,
  currentPersona,
  isMobile,
}: PersonaSelectorProps) {
  const { t } = useTranslation("persona" as "common");

  const [step, setStep] = useState<number>(currentPersona ? 5 : 0);
  const [scores, setScores] = useState<Scores>(() => {
    if (typeof window === "undefined") return { ...EMPTY_SCORES };
    try {
      const stored = localStorage.getItem("mp_persona_scores");
      if (stored) return JSON.parse(stored) as Scores;
    } catch { /* ignore */ }
    return { ...EMPTY_SCORES };
  });
  const [selectedPersona, setSelectedPersona] = useState<string | null>(currentPersona);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(true);

  // Atrium token: motion gate — prefers-reduced-motion collapses transitions to none
  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sync external currentPersona changes
  useEffect(() => {
    if (currentPersona) {
      setSelectedPersona(currentPersona);
      setStep(5);
    }
  }, [currentPersona]);

  /* ─── ANSWER HANDLER ─── */
  const handleAnswer = useCallback((answerIdx: number) => {
    const q = QUIZ[step];
    if (!q) return;
    const answer = q.answers[answerIdx];

    // Flash gold on selected answer
    setFlashIdx(answerIdx);

    setTimeout(() => {
      setFadeIn(false);
      setTimeout(() => {
        const newScores = { ...scores };
        newScores[answer.primary] += answer.primaryPts;
        newScores[answer.secondary] += answer.secondaryPts;
        setScores(newScores);

        if (step < 4) {
          setStep(step + 1);
          setFlashIdx(null);
          setFadeIn(true);
        } else {
          // Quiz complete
          const persona = calcPersona(newScores);
          setSelectedPersona(persona);
          localStorage.setItem("mp_persona_scores", JSON.stringify(newScores));
          setStep(5);
          setFlashIdx(null);
          setFadeIn(true);
          onPersonaSelected(persona);
        }
      }, 250);
    }, 300);
  }, [step, scores, onPersonaSelected]);

  /* ─── RETAKE ─── */
  const handleRetake = useCallback(() => {
    setSelectedPersona(null);
    setScores({ ...EMPTY_SCORES });
    setStep(0);
    setFlashIdx(null);
    setFadeIn(true);
    localStorage.removeItem("mp_persona_type");
    localStorage.removeItem("mp_persona_scores");
  }, []);

  /* ═══════════════════════════════════════════════════════════
     RESULT VIEW (compact card — shown after quiz or on revisit)
     ═══════════════════════════════════════════════════════════ */
  if (step === 5 && selectedPersona) {
    const persona = PERSONAS.find((p) => p.id === selectedPersona);
    if (!persona) return null;

    const max = maxScore(scores);
    const totalPts = DIMENSIONS.reduce((s, d) => s + scores[d], 0) || 1;

    // If scores are all 0, it means they had an old persona without scores — show compact
    const hasScores = totalPts > 4;

    return (
      <TuscanCard variant="glass" padding="1.5rem">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              background: "rgba(154,79,42,0.11)", // Atrium token: terracotta medallion
              border: "0.0625rem solid #E3D6BC", // Atrium token: hairline
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PersonaIcon id={selectedPersona} size={24} color="#9A4F2A" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 700, // Atrium token: overline voice
                color: "#716A5E", // Atrium token: muted ink
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "0.125rem",
              }}
            >
              {t("selectedLabel")}
            </div>
            <div
              style={{
                fontFamily: T.font.display,
                fontSize: "1.1875rem", // Atrium token: titleM
                fontWeight: 600,
                color: "#403B36", // Atrium token: ink
                lineHeight: 1.15,
              }}
            >
              {t("resultTitle").replace("{type}", t(persona.labelKey))}
            </div>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: "#716A5E", // Atrium token: muted ink, full opacity
                margin: "0.25rem 0 0",
                lineHeight: 1.4,
              }}
            >
              {t(persona.descKey)}
            </p>

            {/* Dimension breakdown bars */}
            {hasScores && (
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {DIMENSIONS.map((dim) => {
                  const pct = Math.round((scores[dim] / max) * 100);
                  return (
                    <div key={dim} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          color: "#716A5E", // Atrium token: muted ink
                          width: "4.5rem",
                          textTransform: "capitalize",
                          flexShrink: 0,
                        }}
                      >
                        {t(DIM_LABEL_KEY[dim])}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: "0.375rem",
                          borderRadius: "0.1875rem",
                          background: "#E3D6BC", // Atrium token: hairline (was cream-on-cream)
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            borderRadius: "0.1875rem",
                            background: DIM_COLOR[dim],
                            transition: reducedMotion ? "none" : "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem", // Atrium token: ramp floor
                          color: "#716A5E", // Atrium token: muted ink
                          width: "2rem",
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={handleRetake}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem", // Atrium token: meta
              fontWeight: 600,
              color: "#9A4F2A", // Atrium token: terracotta glyph
              background: "none",
              border: "0.0625rem solid rgba(154,79,42,0.35)", // Atrium token: terracotta rule
              borderRadius: "0.75rem", // Atrium token: small control
              padding: "0.375rem 0.75rem",
              cursor: "pointer",
              flexShrink: 0,
              transition: reducedMotion ? "none" : "all 0.2s ease",
              alignSelf: "flex-start",
            }}
          >
            {t("retake")}
          </button>
        </div>
      </TuscanCard>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     QUIZ VIEW (5 questions)
     ═══════════════════════════════════════════════════════════ */
  const question = QUIZ[step];
  if (!question) return null;

  return (
    <TuscanCard variant="glass" padding="1.75rem">
      {/* Title + progress */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.1875rem", // Atrium token: titleM
            fontWeight: 600,
            color: "#403B36", // Atrium token: ink
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: "0.015em",
          }}
        >
          {t("title")}
        </h3>
        <div
          aria-hidden="true"
          style={{
            height: "0.0625rem", // Atrium token: hairline rule
            width: "3.5rem",
            marginTop: "0.5rem",
            background: "linear-gradient(90deg, rgba(154,79,42,0.35), transparent)", // Atrium token: zone rule
            borderRadius: "0.125rem",
          }}
        />

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "0.75rem",
            alignItems: "center",
          }}
        >
          {QUIZ.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? "1.5rem" : "0.5rem",
                height: "0.5rem",
                borderRadius: "0.25rem",
                background: i < step
                  ? "#B85C38" // Atrium token: ember (active state)
                  : i === step
                    ? "#B85C38"
                    : "#E3D6BC", // Atrium token: hairline
                transition: reducedMotion ? "none" : "all 0.3s ease",
              }}
            />
          ))}
          <span
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: "#716A5E", // Atrium token: muted ink
              marginLeft: "0.25rem",
            }}
          >
            {step + 1}/5
          </span>
        </div>
      </div>

      {/* Question text */}
      <div
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateX(0)" : "translateX(-0.5rem)",
          transition: reducedMotion ? "none" : "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        <p
          style={{
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 500,
            color: "#403B36", // Atrium token: ink (was off-palette walnut)
            margin: "0 0 1.25rem",
            lineHeight: 1.4,
          }}
        >
          {t(question.textKey)}
        </p>

        {/* Answer options */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {question.answers.map((answer, idx) => {
            const isFlashed = flashIdx === idx;
            return (
              <button
                key={answer.labelKey}
                onClick={() => flashIdx === null && handleAnswer(idx)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "0.85rem", // Atrium token: small control
                  border: `0.0625rem solid ${isFlashed ? "#B85C38" : "#E3D6BC"}`, // Atrium token: ember / hairline
                  background: isFlashed ? "rgba(154,79,42,0.11)" : T.color.white, // Atrium token: terracotta tint
                  cursor: flashIdx === null ? "pointer" : "default",
                  textAlign: "left",
                  transition: reducedMotion ? "none" : "all 0.2s ease",
                  boxShadow: isFlashed
                    ? "0 0.5rem 1.5rem rgba(64,59,54,0.14), 0 0 0 0.0625rem rgba(154,79,42,0.35)" // Atrium token: S2 warm ink + rule ring
                    : "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1 warm ink
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: "#403B36", // Atrium token: ink
                  lineHeight: 1.4,
                }}
              >
                {t(answer.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </TuscanCard>
  );
}
