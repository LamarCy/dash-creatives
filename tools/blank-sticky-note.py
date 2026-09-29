#!/usr/bin/env python3
"""Regenerate the blank gateway sticky notes from Durrell's photographed sheet.

The gateway shows five notes. Two were photographed already lettered
(note-dlamar, note-lamarcy); the other three need the same sheet with nothing
written on it, so a header or logo can be composited on top.

Rather than re-cutting the 4032px original, this strips the lettering off
note-dlamar.webp, which keeps the paper, torn edge and contact shadow
byte-identical to the notes it sits beside.

Approach, and why the obvious ones fail:

  * A median filter leaves ghosting. The signature strokes are wider than any
    radius that still preserves the note's edges.
  * Masking individual strokes fails twice over. The contact shadow is also
    "thin and dark" to a 31px median, so it gets flagged as ink and smoothed
    into a broken dashed edge; and under a thick stroke the median is itself
    dragged dark, so the stroke's core reads as clean paper and survives.
  * Detecting ink against a fitted polynomial instead runs away: a degree-4
    surface cannot track the paper's local mottling, so clean paper keeps
    joining the mask (it converged at 17% of the frame).

What works is not detecting ink at all. The sheet has 140 rows of clean paper
directly below the writing, so that real paper is transplanted over it and
re-based onto the destination's tone through a smooth model fitted only to
clean rows:

    patch = donor - model(donor_rows) + model(dest_rows)

Both feather seams are placed outside the written rows, or the blend pulls the
ink back in at the band edges.

Row geometry is measured, not assumed -- print_profile() shows it.
"""
import os
import numpy as np
from PIL import Image, ImageEnhance, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
GATEWAY = os.path.join(HERE, '..', 'web', 'public', 'gateway')
ASSETS = os.path.join(HERE, 'assets')          # pristine cutouts, never written
SRC = os.path.join(ASSETS, 'note-dlamar.webp')
SRC_LAMARCY = os.path.join(ASSETS, 'note-lamarcy.webp')

# Measured off the source sheet (366x380):
#   rows  10-105  clean paper
#   rows 108-202  handwriting (luminance min drops to 54)
#   rows 207-347  clean paper
#   rows 348+     contact shadow
WY0, WY1 = 88, 222     # replaced band; feathers (88-104, 206-222) miss the ink
SY0      = 207         # donor: clean paper below the writing
FEATHER  = 16
CLEAN    = ((10, 105), (212, 345))


def print_profile(path=SRC):
    """Row luminance profile: how the constants above were established."""
    im = Image.open(path).convert('RGBA')
    L = np.asarray(im.convert('L')).astype(float)
    print(' row   mean    min   (interior columns 60-310)')
    for y in range(0, im.height, 10):
        row = L[y, 60:310]
        print(f'{y:4d}  {row.mean():6.1f}  {row.min():5.0f}')


def _model(rgb, alpha, h, w):
    """Degree-4 paper surface fitted to clean rows only -- never to the writing."""
    clean = np.zeros((h, w), bool)
    for y0, y1 in CLEAN:
        clean[y0:y1] = True
    clean &= (alpha > 200)

    gy, gx = np.mgrid[0:h, 0:w]
    X = (gx / w - .5).astype(np.float32)
    Y = (gy / h - .5).astype(np.float32)
    terms = [np.ones_like(X)]
    for i in range(1, 5):
        for j in range(i + 1):
            terms.append((X ** (i - j)) * (Y ** j))
    A = np.stack([t.ravel() for t in terms], axis=1)

    out = np.zeros_like(rgb)
    pm = clean.ravel()
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A[pm], rgb[..., c].ravel()[pm], rcond=None)
        out[..., c] = (A @ coef).reshape(h, w)
    return out


def blank_sheet(path=SRC):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    arr = np.asarray(im).astype(np.float32)
    rgb, alpha = arr[..., :3].copy(), arr[..., 3]

    bh = WY1 - WY0
    assert SY0 + bh <= 345, 'donor would run into the contact shadow'

    model = _model(rgb, alpha, h, w)
    patch = rgb[SY0:SY0 + bh] - model[SY0:SY0 + bh] + model[WY0:WY1]

    wgt = np.ones(bh, np.float32)
    wgt[:FEATHER] = np.linspace(0, 1, FEATHER)
    wgt[-FEATHER:] = np.linspace(1, 0, FEATHER)
    wgt = wgt[:, None, None]

    out = rgb.copy()
    out[WY0:WY1] = rgb[WY0:WY1] * (1 - wgt) + patch * wgt
    out = np.clip(out, 0, 255)

    verify(rgb, out, alpha)
    return Image.fromarray(np.dstack([out, alpha]).astype(np.uint8))


def verify(rgb, out, alpha):
    """Two invariants: no ink left, and nothing outside the band was touched."""
    L = .2126 * out[..., 0] + .7152 * out[..., 1] + .0722 * out[..., 2]
    worst = max(r.mean() - r.min() for r in (L[y, 60:310] for y in range(85, 230)))
    assert worst < 12, f'ink still present in the replaced band (spread {worst:.1f})'

    d = np.abs(rgb - out).mean(axis=2)
    untouched = np.ones(d.shape, bool)
    untouched[WY0:WY1] = False
    assert d[untouched].max() == 0, 'pixels outside the replaced band changed'
    print(f'  verified: max stroke spread {worst:.1f}, '
          f'{d[untouched].max():.0f} change outside rows {WY0}-{WY1}')


# --- bottom edge -------------------------------------------------------------
# The contact shadow is removed, not softened: the notes are meant to sit flat
# with no shadow at all. Paper runs 177-240 in luminance and the shadow 40-70,
# so a threshold at 120 separates them with wide margin either side.

PAPER_MIN = 120    # luminance floor that still counts as paper
EDGE_DEG  = 4      # the sheet's bottom is a gentle curve
EDGE_AA   = 1.3    # antialias width on the new edge


def strip_shadow(im):
    """Cut the contact shadow off the bottom, keeping the paper and its wrinkles.

    The bottom is fitted as a low-order polynomial -- smooth by construction,
    so it cannot stair-step -- then offset down until it sits at or below the
    true paper edge everywhere. Clamping per-column instead reintroduced 4px of
    raggedness; a plain smoothed average left a sliver of shadow at the corners
    where the sheet curves up sharply.
    """
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    h, w = al.shape
    L = .2126 * rgb[..., 0] + .7152 * rgb[..., 1] + .0722 * rgb[..., 2]
    ispaper = (L > PAPER_MIN) & (al > 128)

    edge = np.full(w, np.nan)
    for c in range(w):
        r = np.nonzero(ispaper[:, c])[0]
        if r.size:
            edge[c] = r.max()
    idx = np.arange(w)
    ok = ~np.isnan(edge)
    e = np.interp(idx, idx[ok], edge[ok])

    x = idx / w - .5
    curve = np.polyval(np.polyfit(x, e, EDGE_DEG), x)
    curve -= max(0.0, float((curve - e).max())) + 1.0

    ys = np.arange(h)[:, None]
    cut = np.clip((curve[None, :] - ys) / EDGE_AA + 0.5, 0, 1)
    img = Image.fromarray(np.dstack([rgb, np.minimum(al, cut * 255.0)]).astype(np.uint8))
    img = img.crop(img.getbbox())

    a2 = np.asarray(img.convert('RGBA'))
    al2 = a2[..., 3]
    L2 = .2126 * a2[..., 0] + .7152 * a2[..., 1] + .0722 * a2[..., 2]
    low = al2 > 128
    low[:int(img.height * 0.70)] = False
    assert L2[low].min() > 70, 'contact shadow still visible below the sheet'
    cols = [int(np.nonzero(al2[:, c] > 128)[0].max())
            for c in range(5, img.width - 5) if (al2[:, c] > 128).any()]
    jag = max(abs(np.diff(cols)))
    assert jag <= 2, f'bottom edge is stair-stepped ({jag}px)'
    print(f'  shadow stripped: {im.size} -> {img.size}, edge raggedness {jag}px')
    return img


def main():
    sheet = blank_sheet()

    def save(img, name):
        p = os.path.join(GATEWAY, name)
        img.save(p, 'WEBP', quality=92, method=6)
        print(f'  {name:22} {img.size}  {os.path.getsize(p)} bytes')

    # The two lettered photographs get the same treatment, or the row would be
    # three shadowless notes beside two with shadows.
    save(strip_shadow(Image.open(SRC)), 'note-dlamar.webp')
    save(strip_shadow(Image.open(SRC_LAMARCY)), 'note-lamarcy.webp')

    sheet = strip_shadow(sheet)
    # Three sheets off one pad, so the row is not one image repeated.
    save(sheet, 'note-blank-a.webp')
    save(ImageOps.mirror(sheet), 'note-blank-b.webp')

    r, g, b, a = sheet.split()
    c = Image.merge('RGB', (r, g, b))
    c = ImageEnhance.Brightness(c).enhance(0.975)
    c = ImageEnhance.Color(c).enhance(1.05)
    c.putalpha(a)
    # Deeper in tone, so it carries the logo rather than .hand text -- at
    # 4.45:1 worst case it would not clear AA for the yellow/green ink.
    save(c, 'note-blank-c.webp')


if __name__ == '__main__':
    main()
