#!/usr/bin/env python3
"""Generate OpenCourt PWA icons: a badminton court on a sky-blue rounded tile."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public")


def draw_icon(size: int, radius_frac: float = 0.22) -> Image.Image:
    s = size * 4  # supersample for crisp lines
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded tile — sky-600 → sky-500 vertical blend (approx: flat sky-600)
    radius = int(s * radius_frac)
    d.rounded_rectangle([0, 0, s, s], radius=radius, fill=(2, 132, 199, 255))  # sky-600

    # Court: white outline, portrait orientation, centered
    w = int(s * 0.52)
    h = int(s * 0.68)
    x0 = (s - w) // 2
    y0 = (s - h) // 2
    x1, y1 = x0 + w, y0 + h
    lw = max(int(s * 0.028), 4)

    # Outer boundary
    d.rectangle([x0, y0, x1, y1], outline=(255, 255, 255, 255), width=lw)
    # Net (middle horizontal, slightly thicker)
    ny = (y0 + y1) // 2
    d.rectangle([x0, ny - lw, x1, ny + lw], fill=(255, 255, 255, 255))
    # Short service lines (either side of net)
    off = int(h * 0.16)
    d.rectangle([x0, ny - off - lw // 2, x1, ny - off + lw // 2], fill=(255, 255, 255, 255))
    d.rectangle([x0, ny + off - lw // 2, x1, ny + off + lw // 2], fill=(255, 255, 255, 255))
    # Center line from service lines to back boundaries
    cx = (x0 + x1) // 2
    d.rectangle([cx - lw // 2, y0, cx + lw // 2, ny - off], fill=(255, 255, 255, 255))
    d.rectangle([cx - lw // 2, ny + off, cx + lw // 2, y1], fill=(255, 255, 255, 255))

    # Shuttlecock accent: small white circle upper-right inside tile
    r = int(s * 0.055)
    scx, scy = int(s * 0.80), int(s * 0.20)
    d.ellipse([scx - r, scy - r, scx + r, scy + r], fill=(255, 255, 255, 255))

    return img.resize((size, size), Image.LANCZOS)


for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
    draw_icon(size).save(os.path.join(OUT, name))

# favicon.ico from the 32px render
draw_icon(32).save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32)])
print("icons written")
