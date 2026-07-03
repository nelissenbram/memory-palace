import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.thememorypalace.app',
  appName: 'The Memory Palace',
  webDir: 'out',
  server: {
    // Load from live production server — the app uses Server Actions and
    // API routes which are incompatible with static export. This also means
    // web deploys instantly update the native app (no Play Store release needed).
    url: 'https://www.thememorypalace.ai',
    androidScheme: 'https',
    errorPath: 'error.html',
  },
  plugins: {
    StatusBar: {
      // DARK = dark glyphs, for our light cream UI. (LIGHT = white glyphs, invisible on cream.)
      style: 'DARK',
      backgroundColor: '#F2EDE4',
      overlaysWebView: false,
    },
    SplashScreen: {
      // Backstop only — NativeInit calls SplashScreen.hide() the moment the
      // remote React app mounts (the fast path). The previous 3000ms auto-hide
      // could fire BEFORE the remote HTML arrived on a slow/cold-start launch,
      // revealing a blank WKWebView ("not responsive after launch"). A long
      // backstop keeps the branded splash up until real content paints, while
      // still guaranteeing the splash can never get permanently stuck.
      launchShowDuration: 12000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#F2EDE4',
      showSpinner: true,
      spinnerColor: '#8B7355',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
    // Marks every request from the iOS WKWebView so the server can enforce
    // free-tier entitlement on iOS (Apple Guideline 3.1.1 — no paid content
    // purchased outside the app is unlocked on iOS). Read server-side in
    // plan-limits.ts (getUserPlan); mirrored by the mp_platform=ios cookie set
    // in NativeInit for requests where the UA is unavailable.
    appendUserAgent: 'MemoryPalace-iOS',
  },
};

export default config;
