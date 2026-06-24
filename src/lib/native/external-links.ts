import { isNative } from "./platform";

let initialized = false;

/**
 * Native-only global handler for external links (Apple 2.5.1 / 4.2). Inside WKWebView,
 * a raw target=_blank / cross-origin link / mailto can open a stuck blank web view.
 * This routes external http(s) links to SFSafariViewController and hands mailto/tel/sms
 * to the system in the same frame. Same-origin links are left untouched so the Next.js
 * SPA router keeps handling in-app navigation.
 */
export function initExternalLinkHandler() {
  if (initialized || typeof document === "undefined" || !isNative()) return;
  initialized = true;

  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      const anchor = el?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      // System schemes — same-frame navigation hands off to Mail/Phone/Messages
      // instead of spawning a blank web view (common when target=_blank is set).
      if (/^(mailto:|tel:|sms:)/i.test(href)) {
        e.preventDefault();
        window.location.href = href;
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;

      const bareHost = (h: string) => h.replace(/^www\./, "");
      const sameOrigin = bareHost(url.hostname) === bareHost(window.location.hostname);
      // Leave same-origin links to the SPA router — never preventDefault these
      // (would break Next.js <Link> client navigation).
      if (sameOrigin) return;

      // External link → open in an in-app SFSafariViewController sheet.
      e.preventDefault();
      import("@capacitor/browser")
        .then(({ Browser }) => Browser.open({ url: url.toString(), presentationStyle: "popover" }))
        .catch(() => {
          try { window.open(url.toString(), "_blank"); } catch { /* noop */ }
        });
    },
    true, // capture phase
  );
}
