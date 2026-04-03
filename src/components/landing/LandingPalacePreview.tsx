"use client";

import React, { useEffect, useState } from "react";
import { T } from "@/lib/theme";

const C = T.color;

/**
 * LandingPalacePreview — Cinematic animated SVG palace scene
 * with parallax layers, floating particles, and ambient lighting.
 * Purely decorative, no interactivity.
 * Uses CSS animations instead of requestAnimationFrame for performance.
 */
export default function LandingPalacePreview() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(fadeTimer);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: "1.25rem",
        background: `linear-gradient(180deg, ${C.cream} 0%, ${C.sandstone}60 100%)`,
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.8s ease-in-out",
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes lpp-pan-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        @keyframes lpp-pan-clouds {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(1.2px, 0.3px); }
        }
        @keyframes lpp-pan-distant {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(2.4px, 0.6px); }
        }
        @keyframes lpp-pan-mid {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(4px, 0.9px); }
        }
        @keyframes lpp-pan-palace {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5.6px, 1.5px) scale(1.008); }
        }
        @keyframes lpp-pan-trees {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(8px, 1.8px); }
        }
        @keyframes lpp-glow-entrance {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.65; }
        }
        @keyframes lpp-glow-window {
          0%, 100% { opacity: 0.02; }
          50% { opacity: 0.10; }
        }
        @keyframes lpp-particle-float {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0.15;
          }
          25% {
            transform: translate(6px, -15px);
            opacity: 0.30;
          }
          50% {
            transform: translate(0, 0);
            opacity: 0.15;
          }
          75% {
            transform: translate(-6px, 15px);
            opacity: 0.0;
          }
        }
        @keyframes lpp-sun-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(1.6px, 0.9px); }
        }
        .lpp-clouds { animation: lpp-pan-clouds 20s ease-in-out infinite; }
        .lpp-distant { animation: lpp-pan-distant 20s ease-in-out infinite; }
        .lpp-mid { animation: lpp-pan-mid 20s ease-in-out infinite; }
        .lpp-palace { animation: lpp-pan-palace 20s ease-in-out infinite; transform-origin: 480px 350px; }
        .lpp-trees { animation: lpp-pan-trees 20s ease-in-out infinite; }
        .lpp-sun { animation: lpp-sun-drift 20s ease-in-out infinite; }
        .lpp-entrance-glow { animation: lpp-glow-entrance 4.5s ease-in-out infinite; }
        .lpp-window-glow { animation: lpp-glow-window 6s ease-in-out infinite; }
        .lpp-particle {
          animation: lpp-particle-float 8s ease-in-out infinite;
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 960 540"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: "block" }}
      >
        <defs>
          {/* Sky gradient — Tuscan golden hour */}
          <linearGradient id="lpp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A5078" />
            <stop offset="18%" stopColor="#5590B0" />
            <stop offset="38%" stopColor="#A8BCC0" />
            <stop offset="55%" stopColor="#D8D0B8" />
            <stop offset="72%" stopColor="#ECCA98" />
            <stop offset="88%" stopColor="#E09058" />
            <stop offset="100%" stopColor="#C06830" />
          </linearGradient>

          {/* Ground gradient */}
          <linearGradient id="lpp-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B9A5A" />
            <stop offset="40%" stopColor="#7A8B4E" />
            <stop offset="100%" stopColor="#5A6B3A" />
          </linearGradient>

          {/* Entrance glow */}
          <radialGradient id="lpp-entrance-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFCF70" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#D4A030" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4A030" stopOpacity="0" />
          </radialGradient>

          {/* Sun glow */}
          <radialGradient id="lpp-sun-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFE8B0" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#FFD080" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFD080" stopOpacity="0" />
          </radialGradient>

          {/* Haze */}
          <linearGradient id="lpp-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8D8C0" stopOpacity="0" />
            <stop offset="60%" stopColor="#E8D8C0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#E8D8C0" stopOpacity="0.35" />
          </linearGradient>

          {/* Building wall */}
          <linearGradient id="lpp-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5F0E8" />
            <stop offset="100%" stopColor="#E8DDD0" />
          </linearGradient>

          {/* Roof */}
          <linearGradient id="lpp-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9A7A58" />
            <stop offset="100%" stopColor="#C17F59" />
          </linearGradient>

          {/* Shadow cast */}
          <linearGradient id="lpp-shadow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* -- LAYER 0: Sky -- */}
        <rect width="960" height="540" fill="url(#lpp-sky)" />

        {/* Sun */}
        <g className="lpp-sun">
          <ellipse cx="740" cy="180" rx="80" ry="80" fill="url(#lpp-sun-glow)" />
          <ellipse cx="740" cy="180" rx="22" ry="22" fill="#FFE8B0" opacity="0.9" />
        </g>

        {/* Wispy clouds — far background layer */}
        <g className="lpp-clouds">
          {[
            { x: 80, y: 60, w: 180, h: 8 },
            { x: 300, y: 45, w: 140, h: 6 },
            { x: 550, y: 70, w: 200, h: 7 },
            { x: 780, y: 50, w: 120, h: 5 },
            { x: 150, y: 100, w: 100, h: 5 },
            { x: 650, y: 95, w: 160, h: 6 },
          ].map((c, i) => (
            <ellipse
              key={`cloud-${i}`}
              cx={c.x}
              cy={c.y}
              rx={c.w / 2}
              ry={c.h}
              fill="#FFF"
              opacity={0.15 + (i % 3) * 0.05}
            />
          ))}
        </g>

        {/* -- LAYER 1: Distant hills -- */}
        <g className="lpp-distant">
          <path
            d="M-20 340 Q80 280 200 310 Q320 260 480 300 Q600 270 720 290 Q840 260 980 310 L980 400 L-20 400 Z"
            fill="#8A9F6A"
            opacity="0.4"
          />
        </g>

        {/* -- LAYER 2: Mid hills with cypress trees -- */}
        <g className="lpp-mid">
          <path
            d="M-20 360 Q120 310 280 340 Q400 300 480 330 Q580 310 700 330 Q820 300 980 340 L980 420 L-20 420 Z"
            fill="#7A8F5A"
            opacity="0.5"
          />
          {/* Distant cypress trees */}
          {[120, 180, 260, 680, 760, 830].map((x, i) => (
            <g key={`dcyp-${i}`} opacity={0.35 + (i % 2) * 0.1}>
              <rect
                x={x - 1}
                y={315 + (i % 3) * 8}
                width={2}
                height={30 - (i % 3) * 4}
                fill="#5A6A3A"
                rx={1}
              />
              <ellipse
                cx={x}
                cy={315 + (i % 3) * 8}
                rx={4}
                ry={18 - (i % 3) * 3}
                fill="#4A6040"
              />
            </g>
          ))}
        </g>

        {/* -- LAYER 3: Ground plane -- */}
        <rect x="0" y="370" width="960" height="170" fill="url(#lpp-ground)" />
        {/* Ground path leading to palace */}
        <path
          d="M480 540 L450 410 Q478 395 480 395 Q482 395 510 410 Z"
          fill="#C8B898"
          opacity="0.5"
        />
        <path
          d="M480 540 L460 420 Q478 408 480 408 Q482 408 500 420 Z"
          fill="#D4C5A0"
          opacity="0.3"
        />

        {/* -- LAYER 4: Palace — main structure with parallax -- */}
        <g className="lpp-palace">
          {/* Palace shadow on ground */}
          <ellipse cx="480" cy="405" rx="200" ry="18" fill="#000" opacity="0.08" />

          {/* Left wing */}
          <rect x="260" y="320" width="150" height="85" fill="url(#lpp-wall)" />
          <rect x="260" y="316" width="150" height="6" fill="url(#lpp-roof)" rx={1} />
          {/* Left wing shadow */}
          <rect x="260" y="320" width="8" height="85" fill="url(#lpp-shadow)" />
          {/* Left wing windows */}
          {[285, 315, 345, 375].map((wx, i) => (
            <g key={`lw-${i}`}>
              <rect
                x={wx}
                y={340}
                width={14}
                height={22}
                rx={7}
                fill="#3A3A38"
                opacity={0.35}
              />
              <rect
                x={wx}
                y={340}
                width={14}
                height={22}
                rx={7}
                fill="#D4A030"
                className="lpp-window-glow"
                style={{ animationDelay: `${i * 1.2}s` }}
              />
            </g>
          ))}

          {/* Right wing */}
          <rect x="550" y="320" width="150" height="85" fill="url(#lpp-wall)" />
          <rect x="550" y="316" width="150" height="6" fill="url(#lpp-roof)" rx={1} />
          {/* Right wing windows */}
          {[575, 605, 635, 665].map((wx, i) => (
            <g key={`rw-${i}`}>
              <rect
                x={wx}
                y={340}
                width={14}
                height={22}
                rx={7}
                fill="#3A3A38"
                opacity={0.35}
              />
              <rect
                x={wx}
                y={340}
                width={14}
                height={22}
                rx={7}
                fill="#D4A030"
                className="lpp-window-glow"
                style={{ animationDelay: `${(i * 1.5 + 2)}s` }}
              />
            </g>
          ))}

          {/* Central building */}
          <rect x="380" y="270" width="200" height="135" fill="url(#lpp-wall)" />

          {/* Pediment (triangle) */}
          <polygon points="370,270 480,200 590,270" fill="url(#lpp-roof)" />
          <line
            x1="370"
            y1="270"
            x2="590"
            y2="270"
            stroke="#8B7355"
            strokeWidth="2.5"
          />
          {/* Inner pediment detail */}
          <polygon
            points="395,268 480,215 565,268"
            fill="none"
            stroke="#C17F59"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Columns */}
          {[395, 415, 435, 455, 475, 495, 515, 535, 555].map((cx, i) => (
            <g key={`col-${i}`}>
              <rect
                x={cx}
                y={270}
                width={7}
                height={130}
                fill={C.sandstone}
                rx={2}
              />
              {/* Capital */}
              <rect
                x={cx - 2}
                y={268}
                width={11}
                height={5}
                fill="#8B7355"
                rx={1}
              />
              {/* Base */}
              <rect
                x={cx - 2}
                y={397}
                width={11}
                height={5}
                fill="#8B7355"
                rx={1}
              />
            </g>
          ))}

          {/* Entrance doorway */}
          <rect
            x={462}
            y={340}
            width={36}
            height={62}
            rx={18}
            fill="#2C2C2A"
            opacity={0.75}
          />

          {/* Entrance warm glow */}
          <ellipse
            cx={480}
            cy={365}
            rx={40}
            ry={50}
            fill="url(#lpp-entrance-glow)"
            className="lpp-entrance-glow"
          />

          {/* Steps */}
          <rect x={420} y={402} width={120} height={5} fill={C.sandstone} rx={1} />
          <rect
            x={428}
            y={407}
            width={104}
            height={4}
            fill={C.sandstone}
            rx={1}
            opacity={0.7}
          />
          <rect
            x={436}
            y={411}
            width={88}
            height={3}
            fill={C.sandstone}
            rx={1}
            opacity={0.5}
          />
        </g>

        {/* -- LAYER 5: Foreground cypress trees -- */}
        <g className="lpp-trees">
          {/* Left pair */}
          {[{ x: 310, h: 90, s: 1 }, { x: 340, h: 75, s: 0.85 }].map(
            (tree, i) => (
              <g key={`lt-${i}`} opacity={0.85}>
                <rect
                  x={tree.x - 2}
                  y={400 - tree.h * 0.4}
                  width={4}
                  height={tree.h * 0.5}
                  fill="#6A5A3A"
                  rx={1}
                />
                <ellipse
                  cx={tree.x}
                  cy={400 - tree.h * 0.4}
                  rx={10 * tree.s}
                  ry={tree.h * 0.55}
                  fill="#3A5A30"
                />
                <ellipse
                  cx={tree.x}
                  cy={400 - tree.h * 0.5}
                  rx={7 * tree.s}
                  ry={tree.h * 0.4}
                  fill="#4A6A40"
                  opacity={0.6}
                />
              </g>
            ),
          )}
          {/* Right pair */}
          {[{ x: 620, h: 85, s: 0.9 }, { x: 650, h: 78, s: 0.85 }].map(
            (tree, i) => (
              <g key={`rt-${i}`} opacity={0.85}>
                <rect
                  x={tree.x - 2}
                  y={400 - tree.h * 0.4}
                  width={4}
                  height={tree.h * 0.5}
                  fill="#6A5A3A"
                  rx={1}
                />
                <ellipse
                  cx={tree.x}
                  cy={400 - tree.h * 0.4}
                  rx={10 * tree.s}
                  ry={tree.h * 0.55}
                  fill="#3A5A30"
                />
                <ellipse
                  cx={tree.x}
                  cy={400 - tree.h * 0.5}
                  rx={7 * tree.s}
                  ry={tree.h * 0.4}
                  fill="#4A6A40"
                  opacity={0.6}
                />
              </g>
            ),
          )}
        </g>

        {/* -- LAYER 6: Atmospheric haze -- */}
        <rect x="0" y="360" width="960" height="180" fill="url(#lpp-haze)" />

        {/* -- LAYER 7: Floating gold particles -- */}
        <g>
          {Array.from({ length: 18 }).map((_, i) => {
            const px = 300 + (i * 47) % 360;
            const baseY = 250 + (i * 31) % 150;
            const r = 1.2 + (i % 4) * 0.5;
            return (
              <circle
                key={`p-${i}`}
                cx={px}
                cy={baseY}
                r={r}
                fill={C.gold}
                className="lpp-particle"
                style={{ animationDelay: `${i * 0.45}s`, animationDuration: `${6 + (i % 4) * 1.5}s` }}
              />
            );
          })}
        </g>

        {/* -- Subtle vignette overlay -- */}
        <rect
          x="0"
          y="0"
          width="960"
          height="540"
          fill="url(#lpp-sky)"
          opacity="0"
          style={{ pointerEvents: "none" }}
        />
      </svg>

      {/* CSS-based vignette for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "1.25rem",
          boxShadow: "inset 0 0 3.75rem rgba(0,0,0,0.12)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
