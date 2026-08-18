"""
Task 5 — the hero composite. The Keeper travelling the Charleston tideline,
breaching as it passes. 9:16, 4x, seamless, ~11s.

Revision 3: the human figure was cut from the world, so the Keeper carries this
asset alone. It now makes TWO passes per loop at different depths and scales —
one large in the near water, one small and further out — because a single
dolphin crossing an otherwise empty frame left long dead stretches.

Z-order: sky, horizon+boat, water, far Keeper, pier, near Keeper, marsh.
The near pass is drawn in front of the pier so it reads as closer to camera.

Run:  python3 brand/8bit/src/hero.py
Out:  scenes/hero/hero@4x.{mp4,gif} + hero-still@4x.png
"""

from __future__ import annotations

import math

from PIL import Image

from anim_tideline import FPS, SCALE, write_gif, write_mp4
from pixel import EIGHTBIT, render
from scene_tideline import Scene
from sprite_keeper import build as build_keeper

W, H, HZ_FRAC = 270, 480, 0.40

# Each pass: (first frame, last frame, scale, x start %, x end %, depth below
# the waterline, arc height, draw in front of the pier?)
PASSES = [
    {"a": 8, "b": 78, "scale": 2, "x0": 0.98, "x1": 0.30,
     "base": 40, "arc": 36, "front": False},
    {"a": 62, "b": 130, "scale": 3, "x0": 1.02, "x1": 0.10,
     "base": 74, "arc": 52, "front": True},
]

POSE_STEPS = 24


def scale_grid(grid: list, k: int) -> list:
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


def keeper_at(t: float) -> list:
    """Nose up on the way out, level at the peak, nose down on the way in —
    driven by the same spine-slope knob the breach pose uses."""
    return build_keeper(amp=2.0, slope=13.0 * (1.0 - 2.0 * t), fluke_dy=0.0, cy=25.0)


POSES = [keeper_at(i / POSE_STEPS) for i in range(POSE_STEPS + 1)]


def draw_pass(canvas: list, sc: Scene, spec: dict, f: int) -> None:
    if not (spec["a"] <= f < spec["b"]):
        return
    t = (f - spec["a"]) / (spec["b"] - spec["a"])
    pose = POSES[min(POSE_STEPS, int(t * POSE_STEPS + 0.5))]
    k = spec["scale"]
    x = int(W * (spec["x0"] + t * (spec["x1"] - spec["x0"])))
    y = int(sc.hz + spec["base"] - spec["arc"] * math.sin(math.pi * t))
    half = 24 * k
    stamp(canvas, scale_grid(pose, k), x - half, y - half)


def hero_frame(sc: Scene, f: int) -> Image.Image:
    canvas = [["." for _ in range(W)] for _ in range(H)]
    pans = sc.pans(f)

    for name in ("sky", "horizon", "water"):
        stamp(canvas, sc.layer(name, pans[name]), 0, 0)

    for spec in PASSES:
        if not spec["front"]:
            draw_pass(canvas, sc, spec, f)

    stamp(canvas, sc.layer("pier", pans["pier"]), 0, 0)

    for spec in PASSES:
        if spec["front"]:
            draw_pass(canvas, sc, spec, f)

    stamp(canvas, sc.layer("marsh", pans["marsh"]), 0, 0)

    img = render(["".join(r) for r in canvas], "teal")
    return img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)


def main() -> None:
    sc = Scene(W, H, HZ_FRAC, night=False)
    L = sc.loop_frames
    for spec in PASSES:
        assert spec["b"] <= L, f"pass ends at {spec['b']} but the loop is {L} frames"
    frames = [hero_frame(sc, f) for f in range(L)]

    if frames[0].tobytes() != hero_frame(sc, L).tobytes():
        raise AssertionError("hero composite does not loop seamlessly")

    out = EIGHTBIT / "scenes" / "hero"
    out.mkdir(parents=True, exist_ok=True)
    frames[96].save(out / "hero-still@4x.png")
    write_gif(frames, out / "hero@4x.gif")
    write_mp4(frames, out / "hero@4x.mp4")
    g = (out / "hero@4x.gif").stat().st_size / 1e6
    m = (out / "hero@4x.mp4").stat().st_size / 1e6
    print(f"hero: {frames[0].width}x{frames[0].height}, {L}f @ {FPS}fps = "
          f"{L / FPS:.1f}s — gif {g:.1f}MB, mp4 {m:.1f}MB, loop verified")


if __name__ == "__main__":
    main()
