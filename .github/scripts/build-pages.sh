#!/usr/bin/env bash
# Assembles the GitHub Pages site in _site/ with ONLY the game files (docs, tests,
# tooling and repo metadata are not published), and points the absolute link-preview
# URLs (Open Graph) at this host.
#
# Usage: SITE_URL=https://user.github.io/repo bash .github/scripts/build-pages.sh
# When adding new top-level game files or asset folders, list them here too.
set -euo pipefail

SITE_URL="${SITE_URL:?Set SITE_URL to the published base URL, e.g. https://user.github.io/repo}"
SITE_URL="${SITE_URL%/}/"
CANONICAL="https://gamehappybirthday.netlify.app/"
OUT="_site"

rm -rf "$OUT"
mkdir -p "$OUT/assets/icons"
# robots.txt only takes effect at a domain root (e.g. a custom domain); the robots
# meta tag in index.html is what keeps the /<repo>/ subfolder out of search engines.
cp index.html sw.js manifest.webmanifest robots.txt "$OUT/"
cp -r css src "$OUT/"
cp assets/head.png assets/og-image.png "$OUT/assets/"
cp assets/icons/*.png "$OUT/assets/icons/"
touch "$OUT/.nojekyll"   # serve files as-is, no Jekyll processing

# Open Graph needs absolute URLs; rewrite them for this host.
sed -i "s#${CANONICAL}#${SITE_URL}#g" "$OUT/index.html"
if grep -q "$CANONICAL" "$OUT/index.html"; then
  echo "error: canonical URL still present in $OUT/index.html" >&2
  exit 1
fi
grep -q "${SITE_URL}assets/og-image.png" "$OUT/index.html" \
  || { echo "error: og:image was not rewritten to ${SITE_URL}" >&2; exit 1; }

echo "Built $OUT for ${SITE_URL} ($(find "$OUT" -type f | wc -l) files)"
