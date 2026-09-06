#!/usr/bin/env python3
"""Build a transparent-background variant of the brand lockup for light mode.

Uses continuous luminance-based alpha — no flood-fill, no fragmented artwork:
- White background (luma > 230) → fully transparent
- Dark content (luma < 150) → fully opaque, original RGB preserved
- Anti-aliased edges / highlights (luma 150-230) → smooth alpha gradient

The result is a clean RGBA PNG where the dark-green lockup floats on any
light surface without a white box, and edge anti-aliasing stays crisp.
"""
import sys
import numpy as np
from PIL import Image


def build_transparent(src_path: str, dst_path: str) -> None:
    img = np.array(Image.open(src_path).convert("RGB")).astype(np.float64)
    h, w, _ = img.shape

    # Per-pixel luminance (BT.601)
    luma = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]

    # Alpha from luminance:
    #   luma <= 150 → 255 (opaque content)
    #   luma >= 230 → 0   (fully transparent background)
    #   between     → smooth linear gradient (anti-aliased edges)
    alpha = np.clip((230 - luma) / (230 - 150) * 255, 0, 255).astype(np.uint8)

    # Build RGBA — original RGB with computed alpha
    rgb = img.astype(np.uint8)
    rgba = np.dstack([rgb, alpha])

    Image.fromarray(rgba, "RGBA").save(dst_path)
    print(f"wrote {dst_path}  dims={w}x{h}  transparent px: {(alpha == 0).sum()} / {h * w}")


if __name__ == "__main__":
    build_transparent(sys.argv[1], sys.argv[2])
