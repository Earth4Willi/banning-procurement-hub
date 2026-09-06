#!/usr/bin/env python3
"""Remove the white background from the logo using an edge flood-fill.

Flood-filling from the borders only clears the OUTSIDE background, while
leaving near-white pixels inside the artwork (text highlights, etc.)
intact. Produces an RGBA PNG.
"""
import sys
from collections import deque

from PIL import Image


def remove_white_bg(src_path: str, dst_path: str, tol: int = 40) -> None:
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    # A pixel counts as background if its near-white chroma is close to white.
    def is_bg(p):
        r, g, b, _a = p
        # white-ish, but keep strongly-saturated/dark pixels as foreground
        if r < 230 or g < 230 or b < 230:
            return False
        return True

    visited = [[False] * w for _ in range(h)]
    q = deque()

    # Seed: every border pixel that looks like background
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y][x] and is_bg(px[x, y]):
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x] and is_bg(px[x, y]):
                visited[y][x] = True
                q.append((x, y))

    # Flood fill with tolerance: allow neighbours whose distance from the
    # seed colour is within tol.
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                p = px[nx, ny]
                # accept if near-white within tolerance
                if p[0] >= 255 - tol and p[1] >= 255 - tol and p[2] >= 255 - tol:
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Clear everything reached by the flood fill (the exterior background)
    out = img.copy()
    opx = out.load()
    cleared = 0
    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                opx[x, y] = (0, 0, 0, 0)
                cleared += 1

    out.save(dst_path)
    print(f"wrote {dst_path}  total={w * h} cleared={cleared} ({cleared * 100.0 / (w * h):.1f}%)")


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    remove_white_bg(src, dst)
