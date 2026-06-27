#!/bin/bash
# Capacitor build script
# The app loads from the live production server (thememorypalace.ai),
# so we only need to sync native plugins and config — no static export needed.

set -e

echo "==> Preparing Capacitor build..."

# Ensure the webDir exists (required by cap sync even when using server URL)
mkdir -p out

# Self-healing, always-tappable fallback pages (single source of truth).
# Used as the webDir placeholder (index.html) and the WKWebView errorPath.
cp public/native-fallback.html out/index.html
cp public/native-fallback.html out/error.html

# Sync native plugins and config to Android/iOS projects
echo "    Syncing Capacitor plugins and config..."
npx cap sync

echo "==> Capacitor build complete!"
echo "    The app will load from https://thememorypalace.ai"
