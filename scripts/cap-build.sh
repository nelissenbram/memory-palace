#!/bin/bash
# Capacitor build script
# The app loads from the live production server (thememorypalace.ai),
# so we only need to sync native plugins and config — no static export needed.

set -e

echo "==> Preparing Capacitor build..."

# Ensure the webDir exists (required by cap sync even when using server URL)
mkdir -p out

# Create a minimal index.html fallback (shown briefly before server loads)
cat > out/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Memory Palace</title>
  <style>
    body {
      margin: 0; display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #FAFAF7; font-family: system-ui;
    }
    .loader { color: #8B7355; font-size: 16px; }
  </style>
</head>
<body>
  <div class="loader">Loading...</div>
</body>
</html>
HTML

# Sync native plugins and config to Android/iOS projects
echo "    Syncing Capacitor plugins and config..."
npx cap sync

echo "==> Capacitor build complete!"
echo "    The app will load from https://thememorypalace.ai"
