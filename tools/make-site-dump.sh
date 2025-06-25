#!/usr/bin/env bash

# tools/make-site-dump.sh
# ----------------------------------------------------------
# Call from repo root – e.g. in Netlify build after
#   quarto render
#   bash tools/make-site-dump.sh
# ----------------------------------------------------------

set -euo pipefail

# --- where to write -------------------------------------------------
repo_root="$(git rev-parse --show-toplevel)"
out="$repo_root/netlify/functions/shared/site_context.txt"
mkdir -p "$(dirname "$out")"
: >"$out"          # truncate

# --- 1.  All source *.qmd files  -----------------------------------
while IFS= read -r -d '' f; do
  {
    printf '\n### FILE: %s\n\n' "$f"
    # strip YAML front-matter and blank lines
    sed -e '/^---$/,/^---$/d' \
        -e '/^[[:space:]]*$/d' "$f"
  } >>"$out"
done < <(git -C "$repo_root" ls-files -z '*.qmd')

# --- 2.  Hand-written *.html in repo root (exclude _site/) ---------
for f in "$repo_root"/*.html; do
  [[ -e "$f" && ! "$f" =~ /_site/ ]] || continue
  {
    printf '\n### FILE: %s\n\n' "$(basename "$f")"
    # very rough tag strip
    sed -e 's/<[^>]*>//g' \
        -e 's/&nbsp;/ /g' \
        -e '/^[[:space:]]*$/d'  "$f"
  } >>"$out"
done

echo "Site dump written → $out  ($(wc -c <"$out") bytes)"
