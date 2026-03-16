import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memorypalace.app',
  appName: 'The Memory Palace',
  webDir: 'out',
  server: {
    // Load from live production server — the app uses Server Actions and
    // API routes which are incompatible with static export. This also means
    // web deploys instantly update the native app (no Play Store release needed).
    url: 'https://thememorypalace.ai',
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAFAF7',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FAFAF7',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
