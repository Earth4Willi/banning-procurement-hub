# Build the site's single self-contained brand-lockup SVG.
# The master logo (logo main 3.jpg, 665x186) already contains the full
# lockup: brand mark + "Banning Procurement Hub" wordmark baked in.
# The SVG just embeds it (base64) as one copyable image.
# Output: public/logo.svg
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$logoPath = "D:\Opencode\Web Projects\BPH\logo\logo main 3.jpg"
$logo = [System.Drawing.Image]::FromFile($logoPath)
$lw = $logo.Width; $lh = $logo.Height
$logo.Dispose()

$b64 = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($logoPath))

# Lockup is wide (665x186, ~3.57:1). Scale to a viewBox that shows it large
# with a transparent margin, preserving the native ratio.
$mh = 260            # rendered mark height in viewBox units
$mw = [int]($mh * ($lw / $lh))
$padX = 40; $padY = 40
$vw = $mw + 2 * $padX
$vh = $mh + 2 * $padY

$svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 ' + $vw + ' ' + $vh + '" role="img" aria-label="Banning Procurement Hub">' + "`n"
$svg += '  <image x="' + $padX + '" y="' + $padY + '" width="' + $mw + '" height="' + $mh + '" xlink:href="data:image/jpeg;base64,' + $b64 + '"/>' + "`n"
$svg += '</svg>'

$outPath = "D:\Opencode\Web Projects\BPH\public\logo.svg"
[System.IO.File]::WriteAllText($outPath, $svg)
Write-Output ("wrote public/logo.svg (" + (Get-Item $outPath).Length + " bytes), viewBox " + $vw + "x" + $vh)