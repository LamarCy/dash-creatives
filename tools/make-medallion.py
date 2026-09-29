#!/usr/bin/env python3
"""Build the Astral Orb's central medallion from the C.P monogram.

The orb's nucleus renders at 42% of a 64px button -- about 27px -- so the
source square cannot be used as-is: its lettering occupies only half the
width and 97% of the frame is empty field, which at 27px reads as a dark dot.
The mark is recentred and scaled to fill the disc, then masked to a circle so
it seats inside the round orb instead of sitting in it as a square.

The three heart electrons are untouched; they keep orbiting this.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'assets', 'cp-monogram.webp')
OUT_SIZE = 256          # matches orb-heart.png
MARK_WIDTH = 0.66       # lettering width as a fraction of the disc
SS = 4                  # supersample factor for a clean circular edge


def build():
    im = Image.open(SRC).convert('RGB')
    a = np.asarray(im)
    L = .2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]
    ink = L > 128
    ys, xs = np.nonzero(ink)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    field = tuple(int(v) for v in a[4, 4])
    print(f'  source {im.size}, field #{field[0]:02X}{field[1]:02X}{field[2]:02X}, '
          f'mark {x1-x0+1}x{y1-y0+1} ({100*(x1-x0+1)/im.width:.0f}% of width)')

    mark = im.crop((x0, y0, x1 + 1, y1 + 1))

    big = OUT_SIZE * SS
    target_w = int(big * MARK_WIDTH)
    scale = target_w / mark.width
    mark = mark.resize((target_w, max(1, int(mark.height * scale))), Image.LANCZOS)

    disc = Image.new('RGB', (big, big), field)
    disc.paste(mark, ((big - mark.width) // 2, (big - mark.height) // 2))

    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)

    out = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    out.paste(disc, (0, 0))
    out.putalpha(mask)
    out = out.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)

    a2 = np.asarray(out)
    assert a2[..., 3][0, 0] == 0, 'corner should be transparent outside the circle'
    assert a2[..., 3][OUT_SIZE // 2, OUT_SIZE // 2] == 255, 'centre should be opaque'
    edge = ((a2[..., 3] > 0) & (a2[..., 3] < 255)).sum()
    print(f'  circular mask: {edge} antialiased edge px')
    return out


def main():
    med = build()
    for d in ('web/public/gateway',                      # dashcreatives / cprice
              '../Original-Dogman/public/gateway'):      # the Dogman orb
        p = os.path.abspath(os.path.join(HERE, '..', d, 'medallion-cp.webp'))
        if not os.path.isdir(os.path.dirname(p)):
            print(f'  skip (no dir): {p}')
            continue
        med.save(p, 'WEBP', quality=94, method=6)
        print(f'  {p}  {os.path.getsize(p)} bytes')


if __name__ == '__main__':
    main()
