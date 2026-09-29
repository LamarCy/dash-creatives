#!/usr/bin/env python3
"""Build the C.PRICE wordmark for the gateway from the supplied lockup.

The source is a flattened raster: black lettering on a solid white field with
a lot of dead margin. Placed as-is it would sit on the landing page as a white
rectangle, because the fog is #fafaf9 at its lightest and never pure white.

So the white is knocked out -- alpha taken from luminance, which keeps the
antialiasing on the serif edges and on the hairline tagline instead of jagging
them the way a hard threshold would -- and the margin cropped, so spacing is
controlled in CSS rather than inherited from the file.
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'assets', 'cprice-wordmark.png')
OUT = os.path.join(HERE, '..', 'web', 'public', 'gateway', 'cprice-wordmark.webp')
INK = (26, 26, 26)      # the lockup's own black, same as the C.P monogram
PAD = 0.015             # breathing room as a fraction of content width


def build():
    im = Image.open(SRC).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    L = .2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]

    # The lockup's ink is #1A1A1A, not pure black, so a plain 255-L caps alpha
    # at 229 and the mark would sit at 90% opacity. Normalise against the real
    # ink so it reaches full opacity while the antialiasing is preserved.
    ink_L = float(L.min())
    alpha = np.clip((255.0 - L) / (255.0 - ink_L) * 255.0, 0, 255)
    rgb = np.zeros_like(a)
    rgb[..., 0], rgb[..., 1], rgb[..., 2] = INK

    out = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8))
    bbox = out.getbbox()
    pad = int((bbox[2] - bbox[0]) * PAD)
    box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
           min(out.width, bbox[2] + pad), min(out.height, bbox[3] + pad))
    out = out.crop(box)

    arr = np.asarray(out)
    assert arr[..., 3][0, 0] == 0, 'corner must be transparent, not white'
    assert arr[..., 3].max() > 250, 'lettering should reach full opacity'
    soft = int(((arr[..., 3] > 0) & (arr[..., 3] < 255)).sum())
    print(f'  ink luminance {ink_L:.0f} -> normalised to full opacity')
    print(f'  {im.size} -> {out.size} (margin cropped)')
    print(f'  {soft} antialiased px kept, corner alpha {arr[..., 3][0, 0]}')
    return out


if __name__ == '__main__':
    w = build()
    w.save(OUT, 'WEBP', quality=94, method=6)
    print(f'  {os.path.abspath(OUT)}  {os.path.getsize(OUT)} bytes')
