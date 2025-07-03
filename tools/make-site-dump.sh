#!/usr/bin/env bash
# tools/make-site-dump.sh
# ----------------------------------------------------------
# Collects *all* human-authored content (qmd, html, bib, data)
# and concatenates it into a single text file that the Netlify
# functions can load as “site context”.
#
# Call from repo root – e.g. in Netlify build after
#   quarto render
#   bash tools/make-site-dump.sh
# ----------------------------------------------------------

set -euo pipefail

# ---------- Folder / output -----------------------------------------
repo_root="$(git rev-parse --show-toplevel)"
out="$repo_root/netlify/functions/shared/ai_site_context.txt"
mkdir -p "$(dirname "$out")"
: >"$out"          # truncate

# ---------- 1.  All *.qmd  ------------------------------------------
while IFS= read -r -d '' f; do
  {
    printf '\n### FILE: %s\n\n' "$f"
    # strip YAML front-matter and blank lines
    sed -e '/^---$/,/^---$/d' \
        -e '/^[[:space:]]*$/d' "$f"
  } >>"$out"
done < <(git -C "$repo_root" ls-files -z '*.qmd')

# ---------- 2.  All *.html outside _site/ ---------------------------
while IFS= read -r -d '' f; do
  [[ "$f" == _site/* ]] && continue      # ignore generated pages
  {
    printf '\n### FILE: %s\n\n' "$f"
    # very rough tag strip
    sed -e 's/<[^>]*>//g' \
        -e 's/&nbsp;/ /g' \
        -e '/^[[:space:]]*$/d'  "$repo_root/$f"
  } >>"$out"
done < <(git -C "$repo_root" ls-files -z '*.html')

# ---------- 3.  Any bibliography (*.bib) in repo root ---------------
for f in "$repo_root"/*.bib; do
  [[ -e "$f" ]] || continue
  {
    printf '\n### FILE: %s\n\n' "$(basename "$f")"
    cat "$f"
  } >>"$out"
done

# ---------- 4.  Everything in /data  -------------------------------
while IFS= read -r -d '' f; do
  {
    printf '\n### FILE: %s\n\n' "$f"
    cat "$repo_root/$f"
  } >>"$out"
done < <(git -C "$repo_root" ls-files -z 'data/**')

echo "Site dump written → $out  ($(wc -c <"$out") bytes)"
