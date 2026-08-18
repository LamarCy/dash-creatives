"""
Task 5 — the hero composite. LamarCy walks the tideline; the Keeper arcs out
of the water behind him. 9:16, 4x, seamless, ~11s.

Z-order: sky, horizon+boat, water, KEEPER, pier, marsh, LAMARCY. The Keeper
sits behind the pier and the figure; LamarCy stands on the pier deck.

Two timing notes, both load-bearing:

  * The scene loop is 135 frames, and 135 is odd, so a 4-frame walk cycle can
    never complete a whole number of times at a fixed frames-per-step. The
    walk index is therefore derived as a proportion of the loop
    (f * 4 * CYCLES // L), which lands back on frame 0 at the wrap for any
    integer CYCLES; individual steps vary by a frame, which is invisible.
  * CYCLES is chosen so his stride roughly matches the pier scroll speed —
    otherwise he moon-walks. Pier pans 6px/frame, so one stride should cover
    about 6 * (L / CYCLES) px.

Run:  python3 brand/8bit/src/hero.py
Out:  scenes/hero/hero@4x.{mp4,gif} + hero-still@4x.png
"""

from __future__ import annotations

import math

from PIL import Image

from anim_tideline import FPS, SCALE, write_gif, write_mp4
from pixel import EIGHTBIT, RAMPS, render
from scene_tideline import LAYERS, Scene
from sprite_keeper import build as build_keeper
from sprite_lamarcy_walk import FRAMES as WALK_KEYS
from sprite_lamarcy_walk import build_frame as build_walk

W, H, HZ_FRAC = 270, 480, 0.40
SPRITE_SCALE = 2                 # native upscale before the global 4x
KEEPER_SCALE = 2                 # a dolphin should not be smaller than the man
CYCLES = 20                      # stride cycles per loop; see docstring

KEEPER_IN, KEEPER_OUT = 26, 104  # frames the Keeper is visible
KEEPER_BASE = 40                 # depth below the waterline when submerged
KEEPER_ARC = 36                  # peak height of the arc, px.
# Tuned by eye against the render: at 74 the whole dolphin cleared the water
# and read as flying, and with a 3x figure the arc peak passed straight
# through his head. At 36 the back and dorsal break the surface while the
# belly stays under, which is what porpoising actually looks like.


def scale_grid(grid: list, k: int) -> list:
    """Integer nearest-neighbour upscale of an ASCII grid."""
    if k == 1:
        return grid
    out = []
    for row in grid:
        big = "".join(c * k for c in row)
        out.extend([big] * k)
    return out


def stamp(canvas: list, grid: list, ox: int, oy: int) -> None:
    for y, row in enumerate(grid):
        ty = oy + y
        if not (0 <= ty < len(canvas)):
            continue
        for x, code in enumerate(row):
            tx = ox + x
            if code != "." and 0 <= tx < len(canvas[0]):
                canvas[ty][tx] = code


WALK = [scale_grid(build_walk(k), SPRITE_SCALE) for k in WALK_KEYS]


def keeper_at(t: float) -> list:
    """Keeper rotating through its arc: nose up on the way out, level at the
    peak, nose down on the way in. Slope is the same knob the sprite script
    uses for the breach pose."""
    slope = 13.0 * (1.0 - 2.0 * t)
    return build_keeper(amp=2.0, slope=slope, fluke_dy=0.0, cy=25.0)


KEEPER_POSES = [keeper_at(i / 24) for i in range(25)]


def hero_frame(sc: Scene, f: int, L: int) -> Image.Image:
    canvas = [["." for _ in range(W)] for _ in range(H)]
    pans = sc.pans(f)

    for name in ("sky", "horizon", "water"):
        stamp(canvas, sc.layer(name, pans[name]), 0, 0)

    # the Keeper, behind everything in the foreground
    if KEEPER_IN <= f < KEEPER_OUT:
        t = (f - KEEPER_IN) / (KEEPER_OUT - KEEPER_IN)
        pose = KEEPER_POSES[min(24, int(t * 24 + 0.5))]
        # travels right to left, the way the scenery scrolls, so the sprite
        # reads as facing its direction of travel
        kx = int(W * 0.98 - t * W * 0.62)
        ky = int(sc.hz + KEEPER_BASE - KEEPER_ARC * math.sin(math.pi * t))
        half = 24 * KEEPER_SCALE
        stamp(canvas, scale_grid(pose, KEEPER_SCALE), kx - half, ky - half)

    for name in ("pier", "marsh"):
        stamp(canvas, sc.layer(name, pans[name]), 0, 0)

    # LamarCy, walking in place on the pier deck. His sneaker bottom is row 45
    # of the 48-row grid, so the offset puts that row on the deck surface.
    walk = WALK[(f * 4 * CYCLES // L) % 4]
    feet = sc.deck_y + 2
    stamp(canvas, walk, int(W * 0.12), feet - 45 * SPRITE_SCALE)

    img = render(["".join(r) for r in canvas], "teal")
    return img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)


def main() -> None:
    sc = Scene(W, H, HZ_FRAC, night=False)
    L = sc.loop_frames
    frames = [hero_frame(sc, f, L) for f in range(L)]

    if frames[0].tobytes() != hero_frame(sc, L, L).tobytes():
        raise AssertionError("hero composite does not loop seamlessly")

    out = EIGHTBIT / "scenes" / "hero"
    out.mkdir(parents=True, exist_ok=True)
    frames[KEEPER_IN + (KEEPER_OUT - KEEPER_IN) // 2].save(out / "hero-still@4x.png")
    write_gif(frames, out / "hero@4x.gif")
    write_mp4(frames, out / "hero@4x.mp4")
    g = (out / "hero@4x.gif").stat().st_size / 1e6
    m = (out / "hero@4x.mp4").stat().st_size / 1e6
    print(f"hero: {frames[0].width}x{frames[0].height}, {L}f @ {FPS}fps = "
          f"{L / FPS:.1f}s — gif {g:.1f}MB, mp4 {m:.1f}MB, loop verified")


if __name__ == "__main__":
    main()
