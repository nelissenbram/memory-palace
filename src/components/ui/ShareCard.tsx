"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { T } from "@/lib/theme";
import type { Mem } from "@/lib/constants/defaults";

interface ShareCardProps {
  mem?: Mem;
  roomName?: string;
  roomIcon?: string;
  wingName?: string;
  wingIcon?: string;
  memCount?: number;
  accent: string;
  onClose: () => void;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      lines++;
      if (lines >= maxLines) {
        ctx.fillText(line.trim() + "...", x, y);
        return y + lineHeight;
      }
      ctx.fillText(line.trim(), x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, y);
    y += lineHeight;
  }
  return y;
}

export default function ShareCard({ mem, roomName, roomIcon, wingName, wingIcon, memCount, accent, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const getShareUrl = useCallback(() => {
    const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
    if (mem) return base + "#memory=" + mem.id;
    return base;
  }, [mem]);

  const getShareText = useCallback(() => {
    if (mem) return `"${mem.title}" — a memory from The Memory Palace`;
    if (roomName) return `${roomIcon || ""} ${roomName} — ${memCount ?? 0} memories in The Memory Palace`;
    return "The Memory Palace";
  }, [mem, roomName, roomIcon, memCount]);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1200, H = 630;
    canvas.width = W;
    canvas.height = H;

    const hsl = hexToHSL(accent);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, `hsl(${hsl.h}, ${Math.min(hsl.s + 10, 100)}%, ${Math.min(hsl.l + 20, 90)}%)`);
    bg.addColorStop(0.5, `hsl(${hsl.h + 8}, ${hsl.s}%, ${hsl.l + 5}%)`);
    bg.addColorStop(1, `hsl(${hsl.h + 15}, ${Math.max(hsl.s - 10, 10)}%, ${Math.max(hsl.l - 15, 15)}%)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle pattern overlay — vertical lines
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Decorative arch at top center
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.25, 180, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.25, 200, Math.PI, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Card inner area — frosted panel
    const cardX = 60, cardY = 50, cardW = W - 120, cardH = H - 100, cardR = 24;
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const isRoom = !mem && !!roomName;

    if (mem) {
      // Memory card
      let imgRendered = false;

      const renderText = () => {
        // Title
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 46px Georgia, serif";
        ctx.textBaseline = "top";
        const titleX = imgRendered ? 520 : 100;
        const titleMaxW = imgRendered ? 580 : cardW - 80;
        const titleY = imgRendered ? 100 : 160;
        wrapText(ctx, mem.title, titleX, titleY, titleMaxW, 56, 3);

        // Description
        if (mem.desc) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.font = "20px Georgia, serif";
          const descY = imgRendered ? 230 : 300;
          wrapText(ctx, mem.desc, titleX, descY, titleMaxW, 28, 3);
        }

        // Room + wing info at bottom
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.font = "18px Georgia, serif";
        const parts: string[] = [];
        if (roomName) parts.push((roomIcon || "") + " " + roomName);
        if (wingName) parts.push((wingIcon || "") + " " + wingName);
        if (parts.length) ctx.fillText(parts.join("  ·  "), 100, H - 90);

        // Branding
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "italic 16px Georgia, serif";
        ctx.textAlign = "right";
        ctx.fillText("The Memory Palace", W - 100, H - 90);
        ctx.textAlign = "left";

        // Gold accent line
        ctx.fillStyle = "#C8A868";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(100, H - 110, W - 200, 1);
        ctx.globalAlpha = 1;
      };

      if (mem.dataUrl) {
        const img = new Image();
        img.onload = () => {
          // Draw image in left portion with rounded corners
          ctx.save();
          const imgX = 100, imgY = 80, imgW = 380, imgH = 400, imgR = 16;
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, imgR);
          ctx.clip();
          // Cover fill
          const scale = Math.max(imgW / img.width, imgH / img.height);
          const sw = img.width * scale, sh = img.height * scale;
          ctx.drawImage(img, imgX + (imgW - sw) / 2, imgY + (imgH - sh) / 2, sw, sh);
          ctx.restore();
          // Border around image
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, imgR);
          ctx.stroke();
          imgRendered = true;
          renderText();
        };
        img.onerror = () => renderText();
        img.src = mem.dataUrl;
      } else {
        renderText();
      }
    } else if (isRoom) {
      // Room card
      // Big room icon
      ctx.font = "80px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(roomIcon || "", W / 2, 200);

      // Room name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 52px Georgia, serif";
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      wrapText(ctx, roomName || "", W / 2 - 300, 270, 600, 62, 2);

      // Memory count
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(`${memCount ?? 0} memories`, W / 2, 370);

      // Wing info
      if (wingName) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "20px Georgia, serif";
        ctx.fillText(`${wingIcon || ""} ${wingName} Wing`, W / 2, 420);
      }

      ctx.textAlign = "left";

      // Branding
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "italic 16px Georgia, serif";
      ctx.textAlign = "right";
      ctx.fillText("The Memory Palace", W - 100, H - 90);
      ctx.textAlign = "left";

      // Gold line
      ctx.fillStyle = "#C8A868";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(100, H - 110, W - 200, 1);
      ctx.globalAlpha = 1;
    }
  }, [mem, roomName, roomIcon, wingName, wingIcon, memCount, accent]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = mem ? `memory-${mem.id}.png` : `room-${(roomName || "palace").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "memory-palace.png", { type: "image/png" });
      try {
        await navigator.share({ title: getShareText(), text: getShareText(), url: getShareUrl(), files: [file] });
      } catch {
        // user cancelled or not supported with files — try without
        try { await navigator.share({ title: getShareText(), text: getShareText(), url: getShareUrl() }); } catch { /* cancelled */ }
      }
    }, "image/png");
  };

  const shareUrl = getShareUrl();
  const shareText = getShareText();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const title = mem ? mem.title : roomName || "The Memory Palace";

  const socialLinks = [
    { name: "WhatsApp", icon: "\uD83D\uDCAC", url: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { name: "X / Twitter", icon: "\uD83D\uDC26", url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { name: "Email", icon: "\u2709\uFE0F", url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%0A%0A${encodedUrl}` },
    { name: "Facebook", icon: "\uD83D\uDC4D", url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
  ];

  const btnBase: React.CSSProperties = {
    padding: "10px 16px", fontFamily: T.font.body, fontSize: 13, fontWeight: 500,
    borderRadius: 10, border: `1px solid ${T.color.cream}`, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6, transition: "all .15s",
  };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.5)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, animation: "fadeIn .2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.color.linen, borderRadius: 20, border: `1px solid ${T.color.cream}`, boxShadow: "0 16px 70px rgba(44,44,42,.2)", maxWidth: 560, width: "92%", overflow: "hidden", animation: "fadeUp .3s cubic-bezier(.23,1,.32,1)", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Canvas preview */}
        <div style={{ padding: "20px 20px 0" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "auto", borderRadius: 12, border: `1px solid ${T.color.cream}` }} />
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={handleCopyLink} style={{ ...btnBase, flex: 1, background: copied ? `${accent}15` : T.color.white, color: copied ? accent : T.color.charcoal }}>
              {copied ? "\u2713 Copied" : "\uD83D\uDD17 Copy link"}
            </button>
            <button onClick={handleDownload} style={{ ...btnBase, flex: 1, background: T.color.white, color: T.color.charcoal }}>
              {"\u2B07\uFE0F Download"}
            </button>
            {canShare && (
              <button onClick={handleShare} style={{ ...btnBase, flex: 1, background: accent, color: T.color.white, border: "none" }}>
                {"\uD83D\uDCE4 Share"}
              </button>
            )}
          </div>

          {/* Quick share platforms */}
          <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Share to</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {socialLinks.map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ ...btnBase, flex: 1, background: T.color.white, color: T.color.charcoal, textDecoration: "none", justifyContent: "center", fontSize: 12, padding: "10px 8px" }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span>{s.name}</span>
              </a>
            ))}
          </div>

          {/* Close */}
          <button onClick={onClose} style={{ width: "100%", padding: 12, fontFamily: T.font.body, fontSize: 13, background: "transparent", border: `1px solid ${T.color.cream}`, borderRadius: 10, cursor: "pointer", color: T.color.muted }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
