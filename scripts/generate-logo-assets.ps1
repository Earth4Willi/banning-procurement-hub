# Generate brand assets from the master logo (logo/logo main.jpg)
# Outputs: public/main-logo.jpg, public/icon-512.png, public/icon-192.png,
#          src/app/icon.png (favicon), public/og.png (1200x630 social card)
Add-Type -AssemblyName System.Drawing

$logoPath = "D:\Opencode\Web Projects\BPH\logo\logo main.jpg"
$publicDir = "D:\Opencode\Web Projects\BPH\public"
$appDir = "D:\Opencode\Web Projects\BPH\src\app"

if (-not (Test-Path -LiteralPath $logoPath)) { throw "Master logo not found: $logoPath" }

$src = [System.Drawing.Bitmap]::new($logoPath)
Write-Output ("source: " + $src.Width + "x" + $src.Height)

# 1) main site logo (full 4:3 copy)
Copy-Item -LiteralPath $logoPath -Destination (Join-Path $publicDir "main-logo.jpg") -Force

$brand = [System.Drawing.ColorTranslator]::FromHtml("#0d3d1a")

function New-ImageContext([int]$w, [int]$h) {
  $bmp = [System.Drawing.Bitmap]::new($w, $h)
  $gr = [System.Drawing.Graphics]::FromImage($bmp)
  $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gr.Clear($brand)
  return @($bmp, $gr)
}

function Save-Dispose($bmp, $gr, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $gr.Dispose(); $bmp.Dispose()
}

# 2) square app icons: brand-green field + centered square-cropped logo (inset ~16%)
# square-crop source (center, min dimension)
$crop = [Math]::Min($src.Width, $src.Height)
$cropX = [int](($src.Width - $crop) / 2)
$cropRect = [System.Drawing.Rectangle]::new($cropX, 0, $crop, $crop)

function New-Icon([int]$size, [string]$path) {
  $ctx = New-ImageContext $size $size
  $bmp = $ctx[0]; $gr = $ctx[1]
  $pad = [Math]::Round($size * 0.16)
  $dst = [System.Drawing.Rectangle]::new($pad, $pad, $size - 2 * $pad, $size - 2 * $pad)
  $gr.DrawImage($src, $dst, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
  Save-Dispose $bmp $gr $path
  Write-Output ("wrote: " + $path + " (" + $size + "x" + $size + ")")
}

New-Icon 512 (Join-Path $publicDir "icon-512.png")
New-Icon 192 (Join-Path $publicDir "icon-192.png")
New-Icon 512 (Join-Path $appDir "icon.png")

# 3) OG social card 1200x630: brand-green field, full logo centered, gold wordmark
$ctx = New-ImageContext 1200 630
$bmp = $ctx[0]; $gr = $ctx[1]
$logoW = 620
$logoH = [int](620 * ($src.Height / $src.Width))
$logoX = [int]((1200 - $logoW) / 2)
$logoY = 52
$logoRect = [System.Drawing.Rectangle]::new($logoX, $logoY, $logoW, $logoH)
$gr.DrawImage($src, $logoRect, [System.Drawing.Rectangle]::new(0, 0, $src.Width, $src.Height), [System.Drawing.GraphicsUnit]::Pixel)

$gold = [System.Drawing.ColorTranslator]::FromHtml("#f0b429")
$font = [System.Drawing.Font]::new("Segoe UI", 46, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$textBrush = [System.Drawing.SolidBrush]::new($gold)
$textRect = [System.Drawing.RectangleF]::new(0, [int]($logoY + $logoH + 18), 1200, 70)
$sf = [System.Drawing.StringFormat]::new()
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$gr.DrawString("Banning Procurement Hub", $font, $textBrush, $textRect, $sf)
$font.Dispose(); $textBrush.Dispose()
Save-Dispose $bmp $gr (Join-Path $publicDir "og.png")
Write-Output ("wrote: public/og.png (1200x630)")

$src.Dispose()
Write-Output "done"