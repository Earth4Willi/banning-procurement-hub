# Build the site's single self-contained brand-lockup SVG.
#
# Default: embeds the transparent-background lockup (logo logo main 3 light-transparent.png)
#          into public/logo.svg for light-mode use (no white box on light surfaces).
# -Dark:   embeds the dark-ground recolored lockup (logo logo main 3 dark.png)
#          into public/logo-dark.svg for dark-mode use.
#
# Regenerate after any master change:
#   .\build-logo-lockup.ps1          ← light (transparent)
#   .\build-logo-lockup.ps1 -Dark    ← dark surface
param(
    [switch]$Dark
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if ($Dark) {
    $logoPath = "D:\Opencode\Web Projects\BPH\logo\logo main 3 dark.png"
    $outPath  = "D:\Opencode\Web Projects\BPH\public\logo-dark.svg"
} else {
    $logoPath = "D:\Opencode\Web Projects\BPH\logo\logo main 3 light-transparent.png"
    $outPath  = "D:\Opencode\Web Projects\BPH\public\logo.svg"
}

$logo = [System.Drawing.Image]::FromFile($logoPath)
$lw = $logo.Width; $lh = $logo.Height
$logo.Dispose()

$b64 = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($logoPath))
$mime = if ($logoPath -like "*.png") { "image/png" } else { "image/jpeg" }

# Lockup is wide (665x186, ~3.57:1). Scale to a viewBox that shows it large
# with a transparent margin, preserving the native ratio.
$mh = 260            # rendered mark height in viewBox units
$mw = [int]($mh * ($lw / $lh))
$padX = 40; $padY = 40
$vw = $mw + 2 * $padX
$vh = $mh + 2 * $padY

$svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 ' + $vw + ' ' + $vh + '" role="img" aria-label="Banning Procurement Hub">' + "`n"
$svg += '  <image x="' + $padX + '" y="' + $padY + '" width="' + $mw + '" height="' + $mh + '" href="data:' + $mime + ';base64,' + $b64 + '"/>' + "`n"
$svg += '</svg>'

[System.IO.File]::WriteAllText($outPath, $svg)
Write-Output ("wrote " + $outPath + " (" + (Get-Item $outPath).Length + " bytes), viewBox " + $vw + "x" + $vh)
