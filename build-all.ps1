# Build multilingual Quarto site (EN + DE) on PowerShell 7+

$ErrorActionPreference = "Stop"

# -------------------------------------------------------------------

$Langs = @('en', 'de')

# Ask Git for the repo root – works no matter where the script lives
$RepoRoot = (git -C $PSScriptRoot rev-parse --show-toplevel).Trim()

$SrcExt = Join-Path $RepoRoot '_extensions'
$SrcData = Join-Path $RepoRoot 'data'
$SrcImg = Join-Path $RepoRoot 'images'
$SrcJs = Join-Path $RepoRoot 'js'
$Common = @('apa.csl', 'bibliography.bib', 'styles.css')

# Make helper modules in py\ import-able to all notebooks
$Env:PYTHONPATH = if ($Env:PYTHONPATH) {
  "$RepoRoot\py;$Env:PYTHONPATH"
}
else {
  "$RepoRoot\py"
}
# -------------------------------------------------------------------

Write-Host "→ Compile TypeScript"
Push-Location $RepoRoot
npm run build
Pop-Location
Write-Host "✓ TypeScript compiled"

foreach ($Lang in $Langs) {
  $LangDir = Join-Path $RepoRoot $Lang
  if (-not (Test-Path $LangDir)) {
    Write-Error "Language folder '$LangDir' does not exist."; exit 1
  }

  Write-Host "→ Reset $LangDir"
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
        (Join-Path $LangDir '_extensions'),
  (Join-Path $LangDir 'data'),
  (Join-Path $LangDir 'images')
  Remove-Item "$LangDir\*.js" -Force -ErrorAction SilentlyContinue
  foreach ($f in $Common) {
    Remove-Item (Join-Path $LangDir $f) -Force -ea SilentlyContinue
  }

  Write-Host "→ Copy assets"
  Copy-Item -Recurse "$SrcExt\"  (Join-Path $LangDir '_extensions') -Force
  Copy-Item -Recurse "$SrcData\" (Join-Path $LangDir 'data')        -Force
  New-Item -ItemType Directory -Path (Join-Path $LangDir 'images') -Force | Out-Null
  Copy-Item "$SrcImg\*.webp"  (Join-Path $LangDir 'images')
  Copy-Item "$SrcJs\*.js"     $LangDir
  foreach ($f in $Common) {
    Copy-Item (Join-Path $RepoRoot $f) $LangDir
  }

  Write-Host "→ Render $Lang"
  # Touch index.qmd so Quarto updates the Modified date
  (Get-Item (Join-Path $LangDir 'index.qmd')).LastWriteTime = Get-Date
  Push-Location $LangDir
  quarto.exe render
  Pop-Location
}

Write-Host "✓ All languages built"
