# Capacitor Native Build Guide

The Memory Palace uses [Capacitor](https://capacitorjs.com/) to package the Next.js web app as a native iOS and Android application.

## Prerequisites

- **iOS**: macOS with Xcode 15+ and CocoaPods (`sudo gem install cocoapods`)
- **Android**: Android Studio with SDK 24+ installed

## Adding Platforms

Once you have the required IDEs installed, add the native projects:

```bash
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` directories with native project files.

## Development Workflow

### Build for native (static export + sync)

```bash
npm run cap:build
```

This sets `CAPACITOR_BUILD=true`, which makes Next.js produce a static export in `out/`, then syncs that output into the native projects.

### Open in Xcode / Android Studio

```bash
npm run cap:ios       # opens Xcode
npm run cap:android   # opens Android Studio
```

From there, build and run on a simulator or physical device.

### Live reload during development

1. Start the dev server: `npm run dev`
2. In `capacitor.config.ts`, uncomment the `server.url` and `server.cleartext` lines, replacing `localhost` with your machine's LAN IP if testing on a physical device.
3. Run `npx cap sync` then open the native IDE.

## Key Files

| File | Purpose |
|---|---|
| `capacitor.config.ts` | Capacitor settings (app ID, plugins, server config) |
| `next.config.ts` | Conditionally enables `output: 'export'` when `CAPACITOR_BUILD=true` |
| `ios/` | Xcode project (created after `npx cap add ios`) |
| `android/` | Android Studio project (created after `npx cap add android`) |

## Installed Plugins

| Plugin | Use Case |
|---|---|
| `@capacitor/status-bar` | Control status bar appearance |
| `@capacitor/splash-screen` | Native splash screen |
| `@capacitor/keyboard` | Keyboard visibility and resize behavior |
| `@capacitor/haptics` | Haptic feedback for touch interactions |
| `@capacitor/share` | Native share sheet |

## Notes

- The PWA service worker is disabled in Capacitor builds (the `withPWA` wrapper is skipped when `CAPACITOR_BUILD=true`).
- Images use `unoptimized: true` in Capacitor builds since Next.js Image optimization requires a server.
- The `webDir` is set to `out` which is the default Next.js static export directory.
