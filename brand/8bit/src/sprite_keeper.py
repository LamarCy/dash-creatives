"""
Task 3 — the Keeper. The LamarCy creature: a dolphin.

From the opening of Lowcountry Beach —
    "I bet it's dolphins who know / where the ocean gon' hide
     the treasures of my soul"
— so the creature is the one who knows where the treasures are.

Why this is generated instead of hand-typed: a dolphin is an organic curve,
and hand-typing 48 columns of ASCII produced lumpy, asymmetric results. Here
the body is built from a spine curve plus a thickness profile, so the arc
frames come from changing one number instead of redrawing. Every pixel still
lands on the 48x48 grid in exactly four values.

Run:  python3 brand/8bit/src/sprite_keeper.py
Out:  sprites/keeper/{teal,sepia}/{idle,swim1..4,breach}@{1,4,8}x.png
      + swim-sheet, swim.gif
"""

import math

from PIL import Image

from pixel import EIGHTBIT, RAMPS, render, save_scaled, save_sprite

N = 48
BODY_LEN = 34.0        # spine length in pixels
NOSE_X = 4.0           # where the beak starts
R_MAX = 6.4            # half-thickness at the thickest point


def _thickness(t: float) -> float:
    """Beak stays a thin line; body swells early then tapers to the stock."""
    if t < 0.13:
        return 0.9
    if t < 0.34:
        u = (t - 0.13) / 0.21
        return 0.9 + (R_MAX - 0.9) * math.sin(u * math.pi / 2)
    u = (t - 0.34) / 0.66
    return R_MAX * (1.0 - u) ** 0.85 + 1.1 * u


def _spine(t: float, cy: float, amp: float, slope: float) -> float:
    """Body centreline: an arch of height `amp` plus an overall `slope` tilt."""
    return cy - amp * math.sin(math.pi * t) + slope * (t - 0.5)


def build(amp: float = 0.0, slope: float = 0.0, fluke_dy: float = 0.0,
          cy: float = 25.0) -> list[str]:
    solid = [[False] * N for _ in range(N)]
    belly = [[False] * N for _ in range(N)]
    back = [[False] * N for _ in range(N)]

    def put(x: int, y: int, store) -> None:
        if 0 <= x < N and 0 <= y < N:
            store[y][x] = True

    steps = 260
    for i in range(steps + 1):
        t = i / steps
        x = NOSE_X + t * BODY_LEN
        y = _spine(t, cy, amp, slope)
        r = _thickness(t)
        top, bot = int(round(y - r)), int(round(y + r))
        for yy in range(top, bot + 1):
            put(int(round(x)), yy, solid)
        put(int(round(x)), bot, belly)          # pale underside
        put(int(round(x)), top, back)           # shaded topline
        if r > 3:
            put(int(round(x)), bot - 1, belly)

    def spine_at(t: float) -> tuple[float, float]:
        return NOSE_X + t * BODY_LEN, _spine(t, cy, amp, slope)

    def body_edge(x: int, upper: bool) -> int:
        """Row of the body's top (or bottom) edge at column x, for anchoring fins."""
        t = (x - NOSE_X) / BODY_LEN
        t = min(max(t, 0.0), 1.0)
        y = _spine(t, cy, amp, slope)
        r = _thickness(t)
        return int(round(y - r)) if upper else int(round(y + r))

    def fin(x0: int, span: int, peak: int, apex_at: float, upper: bool) -> None:
        """Solid swept-back triangle whose base sits on the body edge."""
        for k in range(span + 1):
            u = k / span
            h = peak * (u / apex_at) if u <= apex_at else peak * (1 - u) / (1 - apex_at)
            h = max(0, int(round(h)))
            base = body_edge(x0 + k, upper)
            for j in range(h + 1):
                put(x0 + k, base - j if upper else base + j, solid)

    dx = int(NOSE_X + 0.42 * BODY_LEN)
    fin(dx, 9, 7, 0.34, upper=True)             # dorsal
    px = int(NOSE_X + 0.28 * BODY_LEN)
    fin(px, 6, 4, 0.30, upper=False)            # pectoral

    # tail fluke — solid crescent spreading back off the stock
    tx, ty = spine_at(1.0)
    tx, ty = int(round(tx)), int(round(ty + fluke_dy))
    for k in range(7):
        spread = int(round(1.2 + k * 0.95))
        for j in range(-spread, spread + 1):
            put(tx - 2 + k, ty + j, solid)      # starts inside the stock so it merges

    # --- resolve to ramp codes -------------------------------------------
    grid = [["." for _ in range(N)] for _ in range(N)]
    for y in range(N):
        for x in range(N):
            if not solid[y][x]:
                continue
            edge = any(
                not (0 <= x + ox < N and 0 <= y + oy < N and solid[y + oy][x + ox])
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if edge:
                grid[y][x] = "K"
            elif belly[y][x]:
                grid[y][x] = "C"
            elif back[y][x]:
                grid[y][x] = "D"
            else:
                grid[y][x] = "T"

    # eye, set just behind the beak on the upper half
    ex, ey = spine_at(0.16)
    eye_y = int(ey - _thickness(0.16) * 0.35)
    for yy in (eye_y, eye_y + 1):
        if 0 <= yy < N and 0 <= int(ex) + 1 < N:
            grid[yy][int(ex) + 1] = "K"

    return ["".join(r) for r in grid]


IDLE = build(amp=0.0, slope=0.0, fluke_dy=0.0)
SWIM = [
    build(amp=1.0, slope=0.0, fluke_dy=-3.0, cy=25),
    build(amp=2.0, slope=0.0, fluke_dy=0.0, cy=24),
    build(amp=1.0, slope=0.0, fluke_dy=3.0, cy=25),
    build(amp=0.0, slope=0.0, fluke_dy=0.0, cy=26),
]
BREACH = build(amp=3.0, slope=13.0, fluke_dy=1.0, cy=27)


def main() -> None:
    out = EIGHTBIT / "sprites" / "keeper"
    save_sprite(IDLE, out, "idle")
    for i, g in enumerate(SWIM, start=1):
        save_sprite(g, out, f"swim{i}")
    save_sprite(BREACH, out, "breach")

    for ramp in RAMPS:
        imgs = [render(g, ramp) for g in SWIM]
        sheet = Image.new("RGBA", (48 * 4, 48), (0, 0, 0, 0))
        for i, im in enumerate(imgs):
            sheet.paste(im, (i * 48, 0), im)
        save_scaled(sheet, out / ramp / "swim-sheet")

        big = [im.resize((192, 192), Image.NEAREST) for im in imgs]
        flat = []
        for im in big:
            bg = Image.new("RGBA", im.size, RAMPS[ramp]["C"])
            bg.paste(im, (0, 0), im)
            flat.append(bg.convert("P", palette=Image.ADAPTIVE, colors=4))
        flat[0].save(out / ramp / "swim.gif", save_all=True,
                     append_images=flat[1:], duration=140, loop=0)

    print("wrote keeper idle, swim1-4, breach, swim-sheet, swim.gif in both ramps")


if __name__ == "__main__":
    main()
