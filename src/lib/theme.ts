export const T = {
  color: {
    linen: "#F2EDE4",
    warmStone: "#E5DDD0",
    sandstone: "#D6CCBA",
    walnut: "#8B7355",
    sage: "#4A6741",
    terracotta: "#C66B3D",
    charcoal: "#1F1B1A",
    cream: "#FCFAF5",
    white: "#FCFAF5",
    muted: "#857B70",
    gold: "#D4AF37",
    goldLight: "#C9A84C",
    goldDark: "#B8922E",
    error: "#C05050",
    success: "#4A6741",
    rustDeep: "#9A4F2A",
    rustDarker: "#6B3318",
    rustShadow: "#3A1A0A",
    rustTint: "#F5DCC9",
    creamGlow: "#FFE8C9",
    ivory: "#F9F5EE",
    lineFaint: "#EBE3D4",
    inkSoft: "#403B36",
  },
  font: {
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  era: {
    roman: {
      primary: "#D4C5A9",     // travertine
      secondary: "#B85C38",   // terracotta
      accent: "#8B7D6B",      // tufa stone
      marble: "#F0EBE0",      // cream marble
      bronze: "#8A7050",      // patinated bronze
      mosaic: "#C17040",      // warm mosaic
    },
    renaissance: {
      primary: "#9A9A8A",     // pietra serena grey
      secondary: "#E8DDD0",   // carrara white
      accent: "#C8A858",      // gilt gold
      marble: "#F5F0E8",      // warm marble
      bronze: "#6A5840",      // dark bronze
      fresco: "#8B6050",      // fresco terracotta
    },
  },
  /* ── Mobile-first design tokens (single source of truth so components stop
     hand-rolling sizes; ADD only, never rename existing color keys). ── */
  space: { xs: "0.5rem", sm: "0.75rem", md: "1rem", lg: "1.5rem", xl: "2rem", section: "clamp(3rem, 8vw, 5rem)" },
  fontSize: { xs: "0.75rem", sm: "0.8125rem", base: "0.9375rem", md: "1rem", lg: "1.125rem", xl: "1.375rem", xxl: "1.75rem" },
  lineHeight: { tight: 1.3, body: 1.6 },
  radius: { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem", pill: "2rem" },
  /** Apple's minimum touch target (44pt). */
  touch: "2.75rem",
  bp: { small: 479, mobile: 767, tablet: 1366 },
  /** Safe-area inset env() strings (use inside max() for fixed/full-screen chrome). */
  safe: {
    top: "env(safe-area-inset-top, 0px)",
    bottom: "env(safe-area-inset-bottom, 0px)",
    left: "env(safe-area-inset-left, 0px)",
    right: "env(safe-area-inset-right, 0px)",
  },
  layout: { topBarH: "3.5rem", bottomBarH: "4rem", gutter: "clamp(1rem, 5vw, 2rem)" },
} as const;

/** Pick a compact value on mobile, a roomier one otherwise. */
export function fluid<A, B>(mobileVal: A, desktopVal: B, isMobile: boolean): A | B {
  return isMobile ? mobileVal : desktopVal;
}
