export type SupportedCurrency = "EUR" | "USD" | "GBP";

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: "\u20AC",
  USD: "$",
  GBP: "\u00A3",
};

// Approximate conversion factors from EUR (updated periodically)
export const CURRENCY_RATES: Record<SupportedCurrency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
};

/**
 * Detect user's preferred currency from locale/timezone.
 */
export function detectCurrency(): SupportedCurrency {
  if (typeof window === "undefined") return "EUR";

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || "en";

    // US timezone or locale
    if (tz?.startsWith("America/") || locale.startsWith("en-US")) return "USD";

    // UK timezone or locale
    if (
      tz?.startsWith("Europe/London") ||
      tz?.startsWith("Europe/Belfast") ||
      locale === "en-GB"
    )
      return "GBP";
  } catch {
    // Fallback to EUR
  }

  return "EUR";
}

/**
 * Convert EUR price to target currency.
 */
export function convertPrice(
  eurPrice: number,
  currency: SupportedCurrency,
): number {
  if (currency === "EUR") return eurPrice;
  const converted = eurPrice * CURRENCY_RATES[currency];
  return Math.round(converted * 100) / 100;
}

/**
 * Format price with currency symbol.
 */
export function formatPrice(
  price: number,
  currency: SupportedCurrency,
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (currency === "EUR") return `${symbol}${price.toFixed(2).replace(".", ",")}`;
  return `${symbol}${price.toFixed(2)}`;
}
