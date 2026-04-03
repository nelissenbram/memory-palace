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
    width: size,
    height: size,
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
  preserve: "#8B6914",
  narrate: "#A0522D",
  organize: "#6B8E23",
  discover: "#4682B4",
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
              background: `${T.color.gold}18`,
              border: `0.0625rem solid ${T.color.gold}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PersonaIcon id={selectedPersona} size={24} color={T.color.gold} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: T.color.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.125rem",
              }}
            >
              {t("selectedLabel")}
            </div>
            <div
              style={{
                fontFamily: T.font.display,
                fontSize: "1.125rem",
                fontWeight: 600,
                color: T.color.charcoal,
                lineHeight: 1.3,
              }}
            >
              {t("resultTitle").replace("{type}", t(persona.labelKey))}
            </div>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
                margin: "0.25rem 0 0",
                lineHeight: 1.5,
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
                          color: T.color.muted,
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
                          background: `${T.color.cream}`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            borderRadius: "0.1875rem",
                            background: DIM_COLOR[dim],
                            transition: "width 0.6s ease-out",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.625rem",
                          color: T.color.muted,
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
              fontSize: "0.75rem",
              fontWeight: 600,
              color: T.color.terracotta,
              background: "none",
              border: `0.0625rem solid ${T.color.terracotta}30`,
              borderRadius: "0.5rem",
              padding: "0.375rem 0.75rem",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s ease",
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
            fontSize: "1.25rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
            letterSpacing: "0.015em",
          }}
        >
          {t("title")}
        </h3>
        <div
          aria-hidden="true"
          style={{
            height: "0.125rem",
            width: "3.5rem",
            marginTop: "0.5rem",
            background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}, transparent)`,
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
                  ? T.color.gold
                  : i === step
                    ? T.color.gold
                    : `${T.color.gold}30`,
                transition: "all 0.3s ease",
              }}
            />
          ))}
          <span
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: T.color.muted,
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
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        <p
          style={{
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 500,
            color: T.color.walnut,
            margin: "0 0 1.25rem",
            lineHeight: 1.5,
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
                  borderRadius: "0.875rem",
                  border: `0.0625rem solid ${isFlashed ? T.color.gold : T.color.cream}`,
                  background: isFlashed ? `${T.color.gold}18` : T.color.white,
                  cursor: flashIdx === null ? "pointer" : "default",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  boxShadow: isFlashed
                    ? `0 0.25rem 0.75rem rgba(0,0,0,0.06), 0 0 0 0.0625rem ${T.color.gold}30`
                    : "0 0.0625rem 0.25rem rgba(0,0,0,0.03)",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: isFlashed ? T.color.charcoal : T.color.walnut,
                  lineHeight: 1.5,
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
