# memory-palace-ios-build — alleen nog app-icons

**Bouw de iOS-app NIET vanaf deze map.** Dit was ooit de handmatige
"bouw-op-een-Mac"-bundel (v1.0.1); die aanpak is vervangen door CI en de oude
bestanden (STEPS.txt, capacitor.config.ts, package.json, out/) zijn verwijderd.
Ze misten o.a. de `cordova-plugin-purchase`-dependency (IAP) en de
`MemoryPalace-iOS` user-agent-marker die de server nodig heeft om de gratis
tier op iOS af te dwingen (Apple Guideline 3.1.1).

Wat hier nog leeft:

- `icons/` — de app-icon-set. **Wordt door beide CI-pipelines gekopieerd** naar
  `ios/App/App/Assets.xcassets/AppIcon.appiconset/`; hier bewerken = overal mee.
- `icon-only.png`, `splash.png` — bronafbeeldingen waaruit de set gegenereerd is.

## Hoe de iOS-app echt gebouwd wordt

1. **GitHub Actions** — `.github/workflows/ios.yml` (handmatige trigger,
   workflow_dispatch). Dit is de pipeline die de live App Store-build 1.4.0
   (21 jul 2026, eerste release met IAP) heeft gemaakt. iPad-simulatortest +
   TestFlight-upload.
2. **Codemagic** — `codemagic.yaml` (workflow `ios-release`), zelfde
   configuratie-opzet, uploadt naar TestFlight.

De marketing-versie staat in BEIDE pipeline-bestanden hardcoded
(`CFBundleShortVersionString`) — bij een versiebump dus allebei aanpassen.
De web-inhoud (incl. paywall-UI) komt via live-load van
https://www.thememorypalace.ai; alleen native wijzigingen (plugins,
entitlements, Info.plist) vereisen een nieuwe binary.

Store-screenshots en -teksten staan los hiervan in `store-assets/`.
