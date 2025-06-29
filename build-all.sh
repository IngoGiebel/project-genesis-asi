#!/usr/bin/env bash

# Build multilingual Quarto site: English and German

set -euo pipefail

# -------------------------------------------------------------------
LANGS=(en de)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_EXT="$ROOT/_extensions"
SRC_DATA="$ROOT/data"
SRC_IMG="$ROOT/images"
SRC_JS="$ROOT/js"
COMMON_FILES=(apa.csl bibliography.bib styles.css)
# -------------------------------------------------------------------

for LANG in "${LANGS[@]}"; do
  LANG_DIR="$ROOT/$LANG"
  [[ -d "$LANG_DIR" ]] || { echo "ERR: $LANG_DIR missing" ; exit 1; }

  echo "→ Reset $LANG_DIR"
  rm -rf \
      "$LANG_DIR/_extensions" \
      "$LANG_DIR/data" \
      "$LANG_DIR/images" \
      "$LANG_DIR"/*.js \
      "${COMMON_FILES[@]/#/$LANG_DIR/}" 2>/dev/null || true

  echo "→ Copy assets"
  cp -R "$SRC_EXT"         "$LANG_DIR/_extensions"
  cp -R "$SRC_DATA"        "$LANG_DIR/data"
  mkdir -p "$LANG_DIR/images"
  cp    "$SRC_IMG"/*.webp  "$LANG_DIR/images/"
  cp    "$SRC_JS"/*.js     "$LANG_DIR/"
  cp    "${COMMON_FILES[@]/#/$ROOT/}" "$LANG_DIR/"

  echo "→ Render $LANG"
  ( cd "$LANG_DIR" && quarto render )
done

echo "✓ All languages built"
