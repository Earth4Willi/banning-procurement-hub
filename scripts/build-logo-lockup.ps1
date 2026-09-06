$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$logoPath = "D:\Opencode\Web Projects\BPH\logo\logo main 2.jpg"
$logo = [System.Drawing.Image]::FromFile($logoPath)
$lw = $logo.Width; $lh = $logo.Height
$logo.Dispose()
$b64 = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($logoPath))
$svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 1600 400" role="img" aria-label="Banning Procurement Hub">' + "`n"
$svg += '  <image x="24" y="10" width="334" height="381" xlink:href="data:image/jpeg;base64,' + $b64 + '"/>' + "`n"
$svg += '  <text x="384" y="250" font-family="Outfit, system-ui, Arial, sans-serif" font-weight="700" font-size="110">' + "`n"
$svg += '    <tspan fill="#0d3d1a">Banning</tspan><tspan fill="#2e9e4f"> Procurement Hub</tspan>' + "`n"
$svg += '  </text>' + "`n"
$svg += '</svg>'
[System.IO.File]::WriteAllText("D:\Opencode\Web Projects\BPH\public\logo.svg", $svg)
Write-Output ("wrote public/logo.svg (" + (Get-Item "D:\Opencode\Web Projects\BPH\public\logo.svg").Length + " bytes)")
