# Build multilingual Quarto site (EN + DE) on PowerShell 7+.

$ErrorActionPreference = "Stop"

# -------------------------------------------------------------------
# $Langs       = @('en','de')
$Langs       = @('en')
$RepoRoot    = $PSScriptRoot
$SrcExt      = Join-Path $RepoRoot '_extensions'
$SrcData     = Join-Path $RepoRoot 'data'
$SrcImg      = Join-Path $RepoRoot 'images'
$SrcJs       = Join-Path $RepoRoot 'js'
$CommonFiles = @('apa.csl','bibliography.bib','styles.css')
# -------------------------------------------------------------------

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
    foreach ($f in $CommonFiles) {
        $target = Join-Path $LangDir $f
        if (Test-Path $target) { Remove-Item $target -Force }
    }

    Write-Host "→ Copy assets"
    Copy-Item -Recurse $SrcExt  (Join-Path $LangDir '_extensions')
    Copy-Item -Recurse $SrcData (Join-Path $LangDir 'data')
    New-Item -ItemType Directory -Path (Join-Path $LangDir 'images') -Force | Out-Null
    Copy-Item "$SrcImg\*.webp"  (Join-Path $LangDir 'images')
    Copy-Item "$SrcJs\*.js"     $LangDir
    foreach ($f in $CommonFiles) {
        Copy-Item (Join-Path $RepoRoot $f) $LangDir
    }

    Write-Host "→ Render $Lang"
    Push-Location $LangDir
    quarto render
    Pop-Location
}

Write-Host "✓ All languages built"
