"use client";

import React from "react";

interface IconProps {
  style?: React.CSSProperties;
  size?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. HeroIllustration — Large animated Roman villa scene
   ═══════════════════════════════════════════════════════════════════════════ */

export function HeroIllustration({ style, size = 400 }: IconProps) {
  const aspectRatio = 800 / 400;
  const width = size * aspectRatio;
  const height = size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 400"
      width={width}
      height={height}
      style={style}
      aria-hidden="true"
    >
      <style>{`
        @keyframes particleFloat {
          0%, 100% { opacity: 0; transform: translateY(0); }
          20% { opacity: 1; }
          80% { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        .hero-particle {
          animation: particleFloat 4s ease-in-out infinite;
        }
        .hero-particle:nth-child(2) { animation-delay: 0.6s; }
        .hero-particle:nth-child(3) { animation-delay: 1.2s; }
        .hero-particle:nth-child(4) { animation-delay: 1.8s; }
        .hero-particle:nth-child(5) { animation-delay: 2.4s; }
        .hero-particle:nth-child(6) { animation-delay: 3.0s; }
        .hero-particle:nth-child(7) { animation-delay: 3.6s; }
        .hero-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }
      `}</style>

      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EEEAE3" />
          <stop offset="100%" stopColor="#D4C5B2" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="hero-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4C5B2" />
          <stop offset="100%" stopColor="#C17F59" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="hero-entrance-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#B8860B" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#B8860B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B7355" />
          <stop offset="100%" stopColor="#C17F59" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="800" height="400" fill="url(#hero-sky)" />

      {/* Ground plane */}
      <ellipse cx="400" cy="360" rx="420" ry="80" fill="url(#hero-ground)" />

      {/* Path to entrance */}
      <path
        d="M400 395 L380 310 L420 310 Z"
        fill="#D4C5B2"
        opacity="0.6"
      />
      <path
        d="M400 395 L370 310 L430 310 Z"
        fill="none"
        stroke="#8B7355"
        strokeWidth="0.5"
        opacity="0.4"
      />

      {/* Left cypress tree */}
      <g opacity="0.85">
        <rect x="218" y="210" width="4" height="100" fill="#8B7355" rx="1" />
        <ellipse cx="220" cy="210" rx="12" ry="55" fill="#4A6741" />
        <ellipse cx="220" cy="200" rx="9" ry="45" fill="#4A6741" opacity="0.7" />
      </g>

      {/* Right cypress tree */}
      <g opacity="0.85">
        <rect x="578" y="210" width="4" height="100" fill="#8B7355" rx="1" />
        <ellipse cx="580" cy="210" rx="12" ry="55" fill="#4A6741" />
        <ellipse cx="580" cy="200" rx="9" ry="45" fill="#4A6741" opacity="0.7" />
      </g>

      {/* Far left cypress */}
      <g opacity="0.5">
        <rect x="168" y="230" width="3" height="75" fill="#8B7355" rx="1" />
        <ellipse cx="170" cy="230" rx="9" ry="40" fill="#4A6741" />
      </g>

      {/* Far right cypress */}
      <g opacity="0.5">
        <rect x="628" y="230" width="3" height="75" fill="#8B7355" rx="1" />
        <ellipse cx="630" cy="230" rx="9" ry="40" fill="#4A6741" />
      </g>

      {/* Left wing */}
      <rect x="240" y="230" width="120" height="80" fill="#F2EDE7" rx="2" />
      <rect x="240" y="228" width="120" height="4" fill="#8B7355" rx="1" />
      {/* Left wing windows */}
      <rect x="258" y="250" width="16" height="24" rx="8" fill="#2C2C2A" opacity="0.3" />
      <rect x="292" y="250" width="16" height="24" rx="8" fill="#2C2C2A" opacity="0.3" />
      <rect x="326" y="250" width="16" height="24" rx="8" fill="#2C2C2A" opacity="0.3" />
      {/* Left wing window glows */}
      <rect x="258" y="250" width="16" height="24" rx="8" fill="#B8860B" opacity="0.15" className="hero-glow" />
      <rect x="292" y="250" width="16" height="24" rx="8" fill="#B8860B" opacity="0.15" className="hero-glow" />

      {/* Right wing */}
      <rect x="440" y="230" width="120" height="80" fill="#F2EDE7" rx="2" />
      <rect x="440" y="228" width="120" height="4" fill="#8B7355" rx="1" />
      {/* Right wing windows */}
      <rect x="458" y="250" width="16" height="24" rx="8" fill="#2C2C2A" opacity="0.3" />
      <rect x="492" y="250" width="16" height="24" rx="8" fill="#2C2C2A" opacity="0.3" />
      <rect x="526" y="250" width="16" height="24" rx="8" fill="#2C2C2A" opacity="0.3" />
      {/* Right wing window glows */}
      <rect x="492" y="250" width="16" height="24" rx="8" fill="#B8860B" opacity="0.15" className="hero-glow" />
      <rect x="526" y="250" width="16" height="24" rx="8" fill="#B8860B" opacity="0.15" className="hero-glow" />

      {/* Central building base */}
      <rect x="340" y="200" width="120" height="110" fill="#EEEAE3" rx="2" />

      {/* Pediment (triangle roof) */}
      <polygon points="330,200 400,150 470,200" fill="url(#hero-roof)" />
      <line x1="330" y1="200" x2="470" y2="200" stroke="#8B7355" strokeWidth="2" />

      {/* Pediment detail triangle */}
      <polygon
        points="350,198 400,162 450,198"
        fill="none"
        stroke="#C17F59"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Columns */}
      {[352, 372, 392, 412, 432, 448].map((x, i) => (
        <g key={i}>
          <rect x={x} y="200" width="6" height="105" fill="#D4C5B2" rx="2" />
          <rect x={x - 1} y="198" width="8" height="4" fill="#8B7355" rx="1" />
          <rect x={x - 1} y="302" width="8" height="4" fill="#8B7355" rx="1" />
        </g>
      ))}

      {/* Entrance doorway */}
      <rect x="386" y="260" width="28" height="50" rx="14" fill="#2C2C2A" opacity="0.7" />

      {/* Entrance warm glow */}
      <ellipse
        cx="400"
        cy="280"
        rx="30"
        ry="40"
        fill="url(#hero-entrance-glow)"
        className="hero-glow"
      />

      {/* Steps */}
      <rect x="360" y="306" width="80" height="4" fill="#D4C5B2" rx="1" />
      <rect x="365" y="310" width="70" height="3" fill="#D4C5B2" rx="1" opacity="0.7" />
      <rect x="370" y="313" width="60" height="3" fill="#D4C5B2" rx="1" opacity="0.5" />

      {/* Roof shadow line */}
      <line x1="340" y1="200" x2="460" y2="200" stroke="#2C2C2A" strokeWidth="0.5" opacity="0.2" />

      {/* Floating gold particles */}
      <g>
        <circle className="hero-particle" cx="370" cy="240" r="2" fill="#B8860B" opacity="0" />
        <circle className="hero-particle" cx="420" cy="220" r="1.5" fill="#B8860B" opacity="0" />
        <circle className="hero-particle" cx="395" cy="260" r="1.8" fill="#B8860B" opacity="0" />
        <circle className="hero-particle" cx="440" cy="245" r="1.2" fill="#B8860B" opacity="0" />
        <circle className="hero-particle" cx="360" cy="255" r="2" fill="#B8860B" opacity="0" />
        <circle className="hero-particle" cx="410" cy="235" r="1.5" fill="#B8860B" opacity="0" />
        <circle className="hero-particle" cx="385" cy="270" r="1" fill="#B8860B" opacity="0" />
      </g>

      {/* Atmospheric haze at bottom */}
      <rect x="0" y="340" width="800" height="60" fill="#EEEAE3" opacity="0.3" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. FeaturePalaceIcon — 3D Palace with columns
   ═══════════════════════════════════════════════════════════════════════════ */

export function FeaturePalaceIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Pediment */}
      <polygon points="8,18 24,6 40,18" fill="none" stroke="#C17F59" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Entablature */}
      <rect x="7" y="17" width="34" height="2.5" rx="0.5" fill="#C17F59" />
      {/* Columns */}
      <rect x="11" y="19.5" width="3" height="18" rx="1.2" fill="#C17F59" />
      <rect x="22.5" y="19.5" width="3" height="18" rx="1.2" fill="#C17F59" />
      <rect x="34" y="19.5" width="3" height="18" rx="1.2" fill="#C17F59" />
      {/* Base */}
      <rect x="6" y="37" width="36" height="2.5" rx="0.5" fill="#C17F59" />
      {/* Steps */}
      <rect x="8" y="39.5" width="32" height="1.5" rx="0.4" fill="#C17F59" opacity="0.6" />
      <rect x="10" y="41" width="28" height="1.5" rx="0.4" fill="#C17F59" opacity="0.35" />
      {/* Door */}
      <rect x="20" y="28" width="8" height="9" rx="4" fill="#C17F59" opacity="0.4" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. FeatureInterviewIcon — Microphone with sound waves
   ═══════════════════════════════════════════════════════════════════════════ */

export function FeatureInterviewIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Mic body */}
      <rect x="19" y="8" width="10" height="18" rx="5" fill="none" stroke="#4A6741" strokeWidth="1.8" />
      {/* Mic stand arc */}
      <path d="M14 24 A10 10 0 0 0 34 24" fill="none" stroke="#4A6741" strokeWidth="1.8" strokeLinecap="round" />
      {/* Stand stem */}
      <line x1="24" y1="34" x2="24" y2="40" stroke="#4A6741" strokeWidth="1.8" strokeLinecap="round" />
      {/* Base */}
      <line x1="18" y1="40" x2="30" y2="40" stroke="#4A6741" strokeWidth="1.8" strokeLinecap="round" />
      {/* Sound waves */}
      <path d="M36 16 A6 6 0 0 1 36 26" fill="none" stroke="#4A6741" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M39 13 A10 10 0 0 1 39 29" fill="none" stroke="#4A6741" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M12 16 A6 6 0 0 0 12 26" fill="none" stroke="#4A6741" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. FeatureCloudIcon — Cloud with upward arrow
   ═══════════════════════════════════════════════════════════════════════════ */

export function FeatureCloudIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Cloud shape */}
      <path
        d="M12 30 A8 8 0 0 1 12 18 A10 10 0 0 1 30 14 A8 8 0 0 1 38 22 A6 6 0 0 1 38 30 Z"
        fill="none"
        stroke="#8B7355"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Upload arrow stem */}
      <line x1="24" y1="38" x2="24" y2="28" stroke="#8B7355" strokeWidth="1.8" strokeLinecap="round" />
      {/* Upload arrow head */}
      <polyline points="19,32 24,27 29,32" fill="none" stroke="#8B7355" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. FeatureTimeCapsuleIcon — Hourglass with sealed envelope
   ═══════════════════════════════════════════════════════════════════════════ */

export function FeatureTimeCapsuleIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Hourglass top cap */}
      <line x1="11" y1="6" x2="27" y2="6" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" />
      {/* Hourglass bottom cap */}
      <line x1="11" y1="38" x2="27" y2="38" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" />
      {/* Hourglass body */}
      <path
        d="M13 7 L13 15 Q13 22 19 22 Q25 22 25 15 L25 7"
        fill="none"
        stroke="#B8860B"
        strokeWidth="1.6"
      />
      <path
        d="M13 37 L13 29 Q13 22 19 22 Q25 22 25 29 L25 37"
        fill="none"
        stroke="#B8860B"
        strokeWidth="1.6"
      />
      {/* Sand top */}
      <path d="M16 10 L22 10 L19 16 Z" fill="#B8860B" opacity="0.3" />
      {/* Sand bottom */}
      <path d="M15 35 L23 35 L19 28 Z" fill="#B8860B" opacity="0.3" />
      {/* Envelope */}
      <rect x="30" y="26" width="14" height="10" rx="1" fill="none" stroke="#B8860B" strokeWidth="1.4" />
      {/* Envelope flap */}
      <polyline points="30,26 37,32 44,26" fill="none" stroke="#B8860B" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Seal dot */}
      <circle cx="37" cy="33" r="2" fill="#B8860B" opacity="0.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. FeatureSharingIcon — Connected people/nodes
   ═══════════════════════════════════════════════════════════════════════════ */

export function FeatureSharingIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Connection lines */}
      <line x1="24" y1="14" x2="12" y2="30" stroke="#4A6741" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="14" x2="36" y2="30" stroke="#4A6741" strokeWidth="1.2" opacity="0.4" />
      <line x1="12" y1="30" x2="36" y2="30" stroke="#4A6741" strokeWidth="1.2" opacity="0.4" />
      {/* Top person */}
      <circle cx="24" cy="10" r="3.5" fill="none" stroke="#4A6741" strokeWidth="1.6" />
      <path d="M18 20 A6 5 0 0 1 30 20" fill="none" stroke="#4A6741" strokeWidth="1.6" strokeLinecap="round" />
      {/* Bottom-left person */}
      <circle cx="12" cy="27" r="3.5" fill="none" stroke="#4A6741" strokeWidth="1.6" />
      <path d="M6 37 A6 5 0 0 1 18 37" fill="none" stroke="#4A6741" strokeWidth="1.6" strokeLinecap="round" />
      {/* Bottom-right person */}
      <circle cx="36" cy="27" r="3.5" fill="none" stroke="#4A6741" strokeWidth="1.6" />
      <path d="M30 37 A6 5 0 0 1 42 37" fill="none" stroke="#4A6741" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. FeatureLegacyIcon — Temple with heart/flame
   ═══════════════════════════════════════════════════════════════════════════ */

export function FeatureLegacyIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Pediment */}
      <polygon points="6,18 24,6 42,18" fill="none" stroke="#C17F59" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Entablature */}
      <line x1="6" y1="18" x2="42" y2="18" stroke="#C17F59" strokeWidth="2" strokeLinecap="round" />
      {/* Left column */}
      <rect x="10" y="19" width="3" height="18" rx="1" fill="#C17F59" />
      {/* Right column */}
      <rect x="35" y="19" width="3" height="18" rx="1" fill="#C17F59" />
      {/* Base */}
      <line x1="6" y1="38" x2="42" y2="38" stroke="#C17F59" strokeWidth="2" strokeLinecap="round" />
      {/* Flame / eternal fire */}
      <path
        d="M24 34 Q20 28 22 24 Q23 22 24 20 Q25 22 26 24 Q28 28 24 34 Z"
        fill="#C17F59"
        opacity="0.45"
      />
      <path
        d="M24 34 Q22 30 23 27 Q24 25 24 23 Q24 25 25 27 Q26 30 24 34 Z"
        fill="#C17F59"
        opacity="0.7"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. AudienceHeritageIcon — Elderly person with photo album
   ═══════════════════════════════════════════════════════════════════════════ */

export function AudienceHeritageIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="18" cy="12" r="5" fill="none" stroke="#8B7355" strokeWidth="1.6" />
      {/* Body */}
      <path d="M10 26 A8 7 0 0 1 26 26" fill="none" stroke="#8B7355" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="18" y1="17" x2="18" y2="26" stroke="#8B7355" strokeWidth="1.6" />
      {/* Photo album - book shape */}
      <rect x="28" y="14" width="14" height="18" rx="1.5" fill="none" stroke="#8B7355" strokeWidth="1.5" />
      {/* Album spine */}
      <line x1="31" y1="14" x2="31" y2="32" stroke="#8B7355" strokeWidth="1.2" />
      {/* Photo squares inside album */}
      <rect x="33" y="17" width="4" height="3.5" rx="0.5" fill="#8B7355" opacity="0.3" />
      <rect x="33" y="22.5" width="4" height="3.5" rx="0.5" fill="#8B7355" opacity="0.3" />
      <rect x="33" y="28" width="4" height="2.5" rx="0.5" fill="#8B7355" opacity="0.2" />
      {/* Lines representing text */}
      <line x1="38.5" y1="18" x2="40.5" y2="18" stroke="#8B7355" strokeWidth="0.8" opacity="0.3" />
      <line x1="38.5" y1="24" x2="40.5" y2="24" stroke="#8B7355" strokeWidth="0.8" opacity="0.3" />
      {/* Ground line */}
      <line x1="8" y1="40" x2="28" y2="40" stroke="#8B7355" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. AudienceGuardianIcon — Parent/child with shield
   ═══════════════════════════════════════════════════════════════════════════ */

export function AudienceGuardianIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Parent - head */}
      <circle cx="16" cy="11" r="4.5" fill="none" stroke="#4A6741" strokeWidth="1.6" />
      {/* Parent - body */}
      <path d="M9 24 A7 6 0 0 1 23 24" fill="none" stroke="#4A6741" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16" y1="15.5" x2="16" y2="24" stroke="#4A6741" strokeWidth="1.6" />
      {/* Child - head */}
      <circle cx="28" cy="17" r="3.5" fill="none" stroke="#4A6741" strokeWidth="1.4" />
      {/* Child - body */}
      <path d="M23 28 A5 4.5 0 0 1 33 28" fill="none" stroke="#4A6741" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="28" y1="20.5" x2="28" y2="28" stroke="#4A6741" strokeWidth="1.4" />
      {/* Shield */}
      <path
        d="M35 20 L42 20 L42 28 Q42 34 38.5 37 Q35 34 35 28 Z"
        fill="none"
        stroke="#4A6741"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Shield center line */}
      <line x1="38.5" y1="22" x2="38.5" y2="34" stroke="#4A6741" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. AudienceArchivistIcon — Person with organized grid/photos
   ═══════════════════════════════════════════════════════════════════════════ */

export function AudienceArchivistIcon({ style, size = 48 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {/* Person - head */}
      <circle cx="14" cy="12" r="4.5" fill="none" stroke="#2C2C2A" strokeWidth="1.5" />
      {/* Person - body */}
      <path d="M7 25 A7 6 0 0 1 21 25" fill="none" stroke="#2C2C2A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="16.5" x2="14" y2="25" stroke="#2C2C2A" strokeWidth="1.5" />
      {/* Grid of organized photos */}
      <rect x="26" y="10" width="7" height="7" rx="1" fill="none" stroke="#2C2C2A" strokeWidth="1.3" />
      <rect x="35" y="10" width="7" height="7" rx="1" fill="none" stroke="#2C2C2A" strokeWidth="1.3" />
      <rect x="26" y="19" width="7" height="7" rx="1" fill="none" stroke="#2C2C2A" strokeWidth="1.3" />
      <rect x="35" y="19" width="7" height="7" rx="1" fill="none" stroke="#2C2C2A" strokeWidth="1.3" />
      <rect x="26" y="28" width="7" height="7" rx="1" fill="none" stroke="#2C2C2A" strokeWidth="1.3" />
      <rect x="35" y="28" width="7" height="7" rx="1" fill="none" stroke="#2C2C2A" strokeWidth="1.3" />
      {/* Photo fill indicators */}
      <rect x="27.5" y="11.5" width="4" height="4" rx="0.5" fill="#2C2C2A" opacity="0.15" />
      <rect x="36.5" y="11.5" width="4" height="4" rx="0.5" fill="#2C2C2A" opacity="0.15" />
      <rect x="27.5" y="20.5" width="4" height="4" rx="0.5" fill="#2C2C2A" opacity="0.15" />
      <rect x="36.5" y="20.5" width="4" height="4" rx="0.5" fill="#2C2C2A" opacity="0.15" />
    </svg>
  );
}
