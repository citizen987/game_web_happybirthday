#!/usr/bin/env bash
# Writes the deployed commit (short hash + commit date and time, Madrid time) into
# the given copy of src/version.js. Used by the Netlify build command and by
# build-pages.sh. Fails loudly if git or the 'dev' placeholder is missing, so a
# deploy never ships an unstamped or broken version file.
#
# Usage: bash .github/scripts/stamp-version.sh <path/to/version.js>
set -euo pipefail

FILE="${1:?Usage: stamp-version.sh <path/to/version.js>}"
PLACEHOLDER="export const VERSION = 'dev';"

grep -qxF "$PLACEHOLDER" "$FILE" \
  || { echo "error: placeholder not found in $FILE (already stamped?)" >&2; exit 1; }

HASH="$(git rev-parse --short HEAD)"
DATE="$(TZ=Europe/Madrid git log -1 --format=%cd --date=format-local:'%d/%m/%Y %H:%M')"
STAMP="${HASH} · ${DATE}"

sed -i "s#^${PLACEHOLDER}\$#export const VERSION = '${STAMP}';#" "$FILE"
grep -qxF "export const VERSION = '${STAMP}';" "$FILE" \
  || { echo "error: failed to stamp $FILE" >&2; exit 1; }

echo "Stamped $FILE: ${STAMP}"
