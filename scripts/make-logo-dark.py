#!/usr/bin/env python3
"""Build a dark-mode variant of the brand lockup for use on dark backgrounds.

Maps luminance to color:
- Dark content (luma 0-180)  → light brand tone (hue preserved)
- White background (luma >230) → dark surface (#0b2412)
- Edge region (luma 180-230) → smooth blend between content and bg
- Near-white highlights (luma ~240) → transition toward dark surface

No flood-fill, no alpha — fully opaque output. Handles anti-aliasing cleanly.
"""
import sys
import numpy as np
from PIL import Image
from colorsys import rgb_to_hsv, hsv_to_rgb


DARK_BG = (11, 36, 18)   # #0b2412 — dark surface
CONTENT_TINT = (180, 224, 190)  # light sage green — dominant content color
HIGHLIGHT = (240, 248, 242)     # near-white with slight green tint


def luminance(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def build_dark(src_path: str, dst_path: str) -> None:
    img = np.array(Image.open(src_path).convert("RGB")).astype(np.float64)
    h, w, _ = img.shape

    # Per-pixel luminance
    luma = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]

    # --- continuous content color (hue-preserved blend between dark and highlight) ---
    # t: 0 at luma=20 (dark content), 1 at luma=240 (near-white highlight)
    t_content = np.clip((luma - 20) / 220, 0, 1)
    content_rgb = np.array(CONTENT_TINT) * (1 - t_content[..., None]) + np.array(HIGHLIGHT) * t_content[..., None]

    # --- background transition: 0 at luma<=180, 1 at luma>=255 ---
    t_bg = np.clip((luma - 180) / 75, 0, 1)

    # Final pixel: blend content and bg
    dark_bg = np.array(DARK_BG)
    out = content_rgb * (1 - t_bg[..., None]) + dark_bg * t_bg[..., None]

    # Save as RGB (opaque, no alpha needed)
    out = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(dst_path)
    print(f"wrote {dst_path}  dims={w}x{h}")


if __name__ == "__main__":
    build_dark(sys.argv[1], sys.argv[2])
