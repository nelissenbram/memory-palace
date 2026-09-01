import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import OfflineBanner from "@/components/OfflineBanner";
import NativeInit from "@/components/NativeInit";
import ConfirmHost from "@/components/ui/ConfirmHost";
import { AccessibilityProvider } from "@/components/providers/AccessibilityProvider";
import { DaylightProvider } from "@/components/providers/DaylightProvider";
import WebVitals from "@/components/WebVitals";
import PostHogProvider from "@/components/PostHogProvider";
import CookieConsent from "@/components/CookieConsent";

// Display serif — warm humanist old-style face with a taller x-height and
// sturdier strokes than Cormorant, so headlines stay solid at sub-hero sizes
// and for 60+ eyes. Optical sizing is tuned in CSS (font-optical-sizing: auto),
// not here — next/font/google does not accept the opsz axis in the import.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI sans — the most legibility-proven humanist sans on Google Fonts:
// tall x-height, open apertures, distinct I/l/1. Also carries eyebrows
// (uppercase + tracking) and the margin-note role Caveat used to fill.
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  verification: {
    google: "SRGU5yT_g8__HK3W0meqAi-4eX3XPN7NpehWPLlk9f8",
  },
  title: {
    default: "The Memory Palace",
    template: "%s · The Memory Palace",
  },
  description: "Your memories, given a home.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/android-chrome-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/android-chrome-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "The Memory Palace",
    description: "Your memories, given a home.",
    url: "https://thememorypalace.ai",
    siteName: "The Memory Palace",
    images: [
      { url: "/brand/alt-social-512.png", width: 512, height: 512, alt: "Memory Palace" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Memory Palace",
    description: "Your memories, given a home.",
    images: ["/brand/alt-social-512.png"],
  },
  alternates: {
    languages: {
      en: "https://thememorypalace.ai",
      nl: "https://thememorypalace.ai?lang=nl",
      de: "https://thememorypalace.ai?lang=de",
      es: "https://thememorypalace.ai?lang=es",
      fr: "https://thememorypalace.ai?lang=fr",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Memory Palace",
  },
  other: {
    "mobile-web-app-capable": "yes",
    referrer: "strict-origin-when-cross-origin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#9B5A38",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("mp_locale")?.value || "en";

  return (
    <html lang={locale} className={`${fraunces.variable} ${sourceSans.variable}`}>
      <head>
        {/* Boot diagnostics removed — was sending device info without consent (Apple Guideline 5.1.2i) */}
        {/* Native WKWebView: tear down any service worker + caches left by an OLDER
            build BEFORE framework JS runs. WKWebView storage persists across app
            updates, so a stale SW serving dead chunk hashes triggers a ChunkLoadError
            reload loop = repeated blank screens on launch. Runs only in native. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try{
              var native=(window.Capacitor)||(window.webkit&&window.webkit.messageHandlers)||(navigator.userAgent.indexOf("CapacitorNative")!==-1);
              if(!native)return;
              if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){
                navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister().catch(function(){})})}).catch(function(){});
              }
              if(window.caches&&caches.keys){
                caches.keys().then(function(k){return Promise.all(k.map(function(n){return caches.delete(n).catch(function(){return false})}))}).catch(function(){});
              }
            }catch(e){}
          })();
        `}} />
        {/* Global reload circuit breaker — caps ALL reloads at 5 per session to prevent infinite loops */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var K="mp_total_reloads",MAX=10;
            // Preserve a pristine reload immune to the breaker, for critical recovery
            // paths (chunk-load failures) that must always be able to recover.
            try{var _r=window.location.reload.bind(window.location);window.__mpForceReload=function(){_r();};}
            catch(e){window.__mpForceReload=function(){window.location.href=window.location.href;};}
            try{
              var n=parseInt(sessionStorage.getItem(K)||"0",10);
              sessionStorage.setItem(K,String(n+1));
              if(n>=MAX){
                var w=function(){console.warn("[MP] Reload blocked: circuit breaker ("+MAX+" reloads)")};
                try{Object.defineProperty(window.location,"reload",{value:w,writable:false});}catch(e){
                  window.location.reload=w;
                }
              }
            }catch(e){}
          })();
        `}} />
        {/* Force clear stale PWA caches — runs before any JS bundles (skip in Capacitor native) */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try{
              if(window.webkit&&window.webkit.messageHandlers)return;if(window.Capacitor)return;if(navigator.userAgent.indexOf("CapacitorNative")!==-1)return;
            }catch(e){return;}
            var V="v63";
            try{
              var s=localStorage.getItem("mp_v");
              if(s!==V){
                localStorage.setItem("mp_v",V);
                if("caches" in window){
                  caches.keys().then(function(k){
                    if(!k.length){return;}
                    Promise.all(k.map(function(n){return caches.delete(n)})).then(function(){
                      if(navigator.serviceWorker){
                        navigator.serviceWorker.getRegistrations().then(function(r){
                          if(!r.length){return;}
                          Promise.all(r.map(function(reg){return reg.unregister()})).then(function(){
                            window.location.reload();
                          });
                        });
                      }
                    });
                  });
                }
              }
            }catch(e){}
          })();
        `}} />
        {/* Auto-reload on stale deployment chunks (ChunkLoadError).
            Runs on native too: server.url=live site means a mid-review web deploy
            rotates chunk hashes and 404s the binary's lazy imports — without this the
            WebView white-screens. Uses __mpForceReload so the global breaker can't
            suppress chunk recovery; keeps its own MAX=3 to prevent loops. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var KEY="mp_chunk_reload";
            var MAX=3;
            function isChunk(m){
              if(!m)return false;
              return m.indexOf("Loading chunk")!==-1
                ||m.indexOf("Failed to fetch dynamically imported module")!==-1
                ||m.indexOf("Failed to load chunk")!==-1
                ||m.indexOf("ChunkLoadError")!==-1
                ||m.indexOf("Loading CSS chunk")!==-1
                ||(m.indexOf("_next/static/chunks/")!==-1&&(m.indexOf("Failed")!==-1||m.indexOf("Error")!==-1));
            }
            function safeReload(){
              try{
                var n=parseInt(sessionStorage.getItem(KEY)||"0",10);
                if(n>=MAX)return;
                sessionStorage.setItem(KEY,String(n+1));
              }catch(e){}
              var doReload=window.__mpForceReload||function(){window.location.reload();};
              if("caches" in window){
                caches.keys().then(function(k){
                  return Promise.all(k.map(function(c){return caches.delete(c)}));
                }).then(function(){doReload()}).catch(function(){doReload()});
              }else{doReload();}
            }
            window.addEventListener("error",function(e){
              if(isChunk(e.message)||isChunk(String(e.error))){e.preventDefault();safeReload();}
            });
            window.addEventListener("unhandledrejection",function(e){
              var m=e.reason&&(e.reason.message||String(e.reason))||"";
              if(isChunk(m)){e.preventDefault();safeReload();}
            });
          })();
        `}} />
        {/* JSON-LD: Organization + WebApplication structured data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "name": "The Memory Palace",
              "url": "https://thememorypalace.ai",
              "logo": "https://thememorypalace.ai/brand/alt-social-512.png",
              "sameAs": [],
            },
            {
              "@type": "WebApplication",
              "name": "The Memory Palace",
              "url": "https://thememorypalace.ai",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web, Android, iOS",
              "description": "A 3D virtual memory palace where families preserve photos, videos, stories, and legacy for future generations.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR",
                "description": "Free plan with 100 memories, 2 wings, 5 rooms",
              },
            },
          ],
        })}} />
        {/* Smart App Banners — iOS App Store + Google Play */}
        <meta name="apple-itunes-app" content="app-id=6745108818" />
        {/* Icons configured via metadata export — no manual links needed */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
        {/* iOS Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Server-rendered loading state — visible until React mounts, then hidden by first client component */}
        <div id="mp-loading" style={{
          position: "fixed", inset: 0, zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "#F2EDE4", fontFamily: "var(--font-display, Georgia, serif)",
          color: "#7A5230", fontSize: "1.25rem", letterSpacing: "0.05em",
          // CRITICAL: never intercept input. The veil is purely cosmetic; with
          // pointerEvents:auto it used to swallow the user's first ~1.2s of taps,
          // reading as "not responsive after launch". Taps now always fall through
          // to the app underneath, hydrated or not.
          pointerEvents: "none",
        }}>
          The Memory Palace
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var el=document.getElementById("mp-loading");if(!el)return;
            function hide(){if(!el)return;el.style.opacity="0";el.style.transition="opacity 0.3s";setTimeout(function(){el.style.display="none"},300);}
            // Backstop in case __mpHideLoading never fires (e.g. hydration error).
            // The veil is already click-through, so this only affects what's VISIBLE.
            var t=setTimeout(hide,4000);
            // First user interaction also dismisses it (belt-and-suspenders).
            function onFirst(){clearTimeout(t);hide();document.removeEventListener("touchstart",onFirst);document.removeEventListener("click",onFirst);}
            document.addEventListener("touchstart",onFirst,{passive:true});
            document.addEventListener("click",onFirst);
            // Dismissed for real by NativeInit once React has mounted real content.
            window.__mpHideLoading=function(){clearTimeout(t);hide();};
          })();
        `}} />
        <a href="#main-content" className="skip-to-content">
          {{ en: "Skip to content", nl: "Ga naar inhoud", de: "Zum Inhalt springen", es: "Saltar al contenido", fr: "Aller au contenu" }[locale] || "Skip to content"}
        </a>
        <WebVitals />
        <PostHogProvider />
        <CookieConsent />
        <ServiceWorkerRegistration />
        <PWAInstallBanner />
        <OfflineBanner />
        <NativeInit />
        <ConfirmHost />
        <AccessibilityProvider>
          <DaylightProvider>
            {children}
          </DaylightProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
