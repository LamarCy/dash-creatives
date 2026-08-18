"""
Task 4 — the pixel Charleston tideline. Layered, loopable, day + night.

PHOTO REFERENCE (brand rule: first-hand or not at all). Frames from
~/Downloads/LamarCy Imagery and Branding/ChaAnnolog Album/Moodboard/ —
note: the path Durrell gave pointed at /Volumes/New Drive, where that folder
does not exist. These are the same frames, in Downloads.

  IMG_2894.jpg   the Corps of Engineers boat ROBERT GRAY at the pier. The
                 boat is measured off this frame: squat hull with the sheer
                 rising to a high bow, boxy wheelhouse with a window row set
                 aft of amidships, tall mast carrying two crosstrees, and the
                 A-frame boom angling aft. Durrell's "squat hull, tall
                 rigging arms".
  IMG_2922.heic  concrete pier on evenly spaced pilings over flat rippled
                 water. Deck thickness, piling rhythm and the dark band under
                 the deck come from here.
  IMG_2916 / IMG_2925 / IMG_2943   low pale harbour horizon with a distant
                 treeline; sets horizon height and the flatness of the water.
  IMG_2940       open water ripple texture; wave-dash length and spacing.

  HONEST GAP: no moodboard frame shows marsh grass. The marsh is the one
  element here not derived from a photograph. Shoot one and I'll redraw it.

Everything is periodic in x so the scene scrolls seamlessly — each layer's
pattern period divides the distance that layer pans in one loop (see PAN).

Run:  python3 brand/8bit/src/scene_tideline.py
Out:  scenes/tideline/{day,night}/{16x9,9x16}/{sky,horizon,water,pier,marsh}@{1,4}x.png
      + flat@{1,4}x.png
"""

from __future__ import annotations

import math

from pixel import EIGHTBIT, render, save_scaled

LAYERS = ["sky", "horizon", "water", "pier", "marsh"]

# Seamlessness has two conditions, and BOTH must hold or the loop ticks at
# the seam:
#   1. every layer's pattern period divides the scene width W, and
#   2. every layer pans a whole multiple of its own period over one loop.
# So the periods are derived per width below rather than hardcoded. The first
# pass hardcoded 480-friendly numbers and the 270-wide vertical format did not
# loop — verified by comparing frame 0 against the wrapped frame.


def _divisor_near(w: int, target: int) -> int:
    """The divisor of w closest to target."""
    divs = [d for d in range(4, w // 2 + 1) if w % d == 0]
    return min(divs, key=lambda d: (abs(d - target), d))

BOAT_LEN = 104          # hull length in native px


def dot(r: float) -> list:
    """Ben-Day dot offsets. Explicit shapes on purpose — a radius test at
    r < 3 draws a plus sign, not a dot, which is how the first pass looked."""
    if r < 0.8:
        return [(0, 0)]
    if r < 1.6:
        return [(0, 0), (1, 0), (0, 1), (1, 1)]
    if r < 2.4:
        return [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2)]
    return [(x, y) for x in range(4) for y in range(4)
            if not (x in (0, 3) and y in (0, 3))]


def treeline_h(x: int, period: int) -> int:
    """Distant treeline height. Integer harmonics of the scene width, so the
    silhouette is inherently periodic in `period`."""
    v = (1.7 * math.sin(2 * math.pi * x * 3 / period)
         + 1.1 * math.sin(2 * math.pi * x * 7 / period + 1.0)
         + 0.8 * math.sin(2 * math.pi * x * 13 / period + 2.0))
    return 3 + int(round(v))


def boat_cells() -> dict:
    """The ROBERT GRAY, from primitives so it can be sized properly.
    Returns {(x, y): code} with y = 0 at the waterline, negative y upward."""
    cells = {}
    L = BOAT_LEN

    def put(x: int, y: int, code: str) -> None:
        cells[(x, y)] = code

    def sheer(x: int) -> int:
        """Top of the hull — rises toward the bow at the left."""
        return -9 - int(round(7 * math.exp(-x / 22.0)))

    def keel(x: int) -> int:
        """Bottom of the hull, curving up at bow and stern."""
        u = (x / L - 0.46) * 2.1
        return 1 - int(round(7 * max(0.0, abs(u)) ** 3.2))

    for x in range(L):                          # hull
        top, bot = sheer(x), keel(x)
        if bot <= top:
            continue
        for y in range(top, bot + 1):
            put(x, y, "D" if y >= bot - 2 else "C")
        put(x, top, "K")
        put(x, bot, "K")
    for y in range(sheer(0), keel(0) + 1):
        put(0, y, "K")
    for y in range(sheer(L - 1), keel(L - 1) + 1):
        put(L - 1, y, "K")

    hx0, hx1 = 30, 68                           # wheelhouse, aft of amidships
    hy1 = sheer(hx0) + 1
    hy0 = hy1 - 15
    for x in range(hx0, hx1 + 1):
        for y in range(hy0, hy1 + 1):
            put(x, y, "C")
    for x in range(hx0, hx1 + 1):
        put(x, hy0, "K")
        put(x, hy1, "K")
    for y in range(hy0, hy1 + 1):
        put(hx0, y, "K")
        put(hx1, y, "K")
    for x in range(hx0 + 3, hx1 - 2, 5):        # window row
        for y in range(hy0 + 3, hy0 + 7):
            put(x, y, "K")
            put(x + 1, y, "K")
    for x in range(hx0 + 2, hx1 - 1):           # roof rail
        put(x, hy0 - 2, "K")

    mx = hx0 + 22                               # mast + two crosstrees
    mast_top = hy0 - 26
    for y in range(mast_top, hy0 - 1):
        put(mx, y, "K")
        put(mx + 1, y, "K")
    for half, yy in ((11, mast_top + 6), (7, mast_top + 13)):
        for x in range(mx - half, mx + half + 2):
            put(x, yy, "K")
    for x in range(mx - 4, mx + 6):
        put(x, mast_top, "K")

    for k in range(34):                         # A-frame boom, aft and down
        x = mx + 2 + k
        y = hy0 + 1 + int(round(k * 0.42))
        put(x, y, "K")
        put(x, y + 1, "K")

    for y in range(sheer(2) - 9, sheer(2)):     # bow flagstaff
        put(3, y, "K")
    return cells


BOAT = boat_cells()


class Scene:
    """Draws one tideline layer set at a given pan offset."""

    def __init__(self, w: int, h: int, horizon_frac: float, night: bool,
                 kind: str = "tideline"):
        # kind picks which furniture the horizon layer carries. The Studio's
        # scene menu needs "open water" (bare horizon) and "harbor" (boat and
        # pier, no marsh) alongside the full tideline.
        self.kind = kind
        self.w, self.h = w, h
        self.hz = int(h * horizon_frac)
        self.night = night
        self.deck_y = int(h * 0.66)
        self.piling_bottom = int(h * 0.88)   # pilings end in the water,
        # above the marsh band — the marsh reads as the nearest thing to camera
        # pitch must divide the sky's pan distance (w // 2), not just w
        self.sky_pitch = _divisor_near(w // 2, 12)
        self.wave_period = _divisor_near(w, 48)
        self.piling_period = _divisor_near(w, 48)
        self.marsh_period = _divisor_near(w, 32)
        # each ripple band's dash+gap total must also divide w
        self.dash_totals = [_divisor_near(w, t) for t in (24, 30, 40, 48)]

    # Pan distance per layer over one loop. Sky moves in whole dot pitches;
    # every other layer moves whole scene widths, which is what lets the
    # unique boat and the piling lattice wrap invisibly.
    def pan_for(self, name: str) -> int:
        mult = {"horizon": 1, "water": 2, "pier": 3, "marsh": 4}
        if name == "sky":
            return self.w // 2
        return mult[name] * self.w

    @property
    def loop_frames(self) -> int:
        """Frames per loop: the largest count that keeps every layer's
        per-frame offset a whole number of pixels."""
        pans = [self.pan_for(n) for n in LAYERS]
        g = pans[0]
        for v in pans[1:]:
            g = math.gcd(g, v)
        divs = [d for d in range(1, g + 1) if g % d == 0]
        return min(divs, key=lambda d: (abs(d - 120), -d))   # ~10s at 12fps

    def pans(self, f: int) -> dict:
        n = self.loop_frames
        return {name: self.pan_for(name) * f // n for name in LAYERS}

    def _blank(self) -> list:
        return [["." for _ in range(self.w)] for _ in range(self.h)]

    @staticmethod
    def _fin(g: list) -> list:
        return ["".join(r) for r in g]

    # --- layers ----------------------------------------------------------
    def sky(self, pan: int = 0) -> list:
        g = self._blank()
        field = "K" if self.night else "C"
        for y in range(self.hz):
            for x in range(self.w):
                g[y][x] = field
        for gy in range(0, self.hz, self.sky_pitch):
            frac = 1.0 - gy / max(1, self.hz)
            r = (0.5 + 3.3 * frac ** 1.35) if not self.night else (0.4 + 1.4 * frac ** 1.3)
            if r < 0.75:
                continue                        # haze band: no dots near the horizon
            stagger = (gy // self.sky_pitch) % 2 * (self.sky_pitch // 2)
            shape = dot(r)
            for gx in range(0, self.w, self.sky_pitch):
                bx = (gx + stagger - pan) % self.w
                for dx, dy in shape:
                    x, y = bx + dx, gy + dy
                    if 0 <= x < self.w and 0 <= y < self.hz:
                        g[y][x] = "T"
        return self._fin(g)

    def horizon(self, pan: int = 0) -> list:
        g = self._blank()
        if self.kind == "open-water":
            return self._fin(g)          # open water: no treeline, no boat
        tone = "T" if self.night else "D"
        for x in range(self.w):
            hx = treeline_h((x + pan) % self.w, self.w)
            for y in range(self.hz - hx, self.hz):
                if 0 <= y < self.h:
                    g[y][x] = tone
        bx = int(self.w * 0.55) - pan
        for (ox, oy), code in BOAT.items():
            x = (bx + ox) % self.w
            y = self.hz + oy
            if 0 <= y < self.h:
                # At night the sky is ink, so ink rigging vanishes into it —
                # the mast, crosstrees and boom all disappeared in the first
                # night render. Outlines go tiffany instead: ink-heavy field,
                # tiffany highlights.
                g[y][x] = "T" if (self.night and code == "K") else code
        return self._fin(g)

    def water(self, pan: int = 0) -> list:
        g = self._blank()
        base = "D" if self.night else "T"
        for y in range(self.hz, self.h):
            for x in range(self.w):
                g[y][x] = base
        wave = "T" if self.night else "D"
        depth = self.h - self.hz
        # A small number of long, clean ripple lines. The first pass put a
        # dash every few px at every depth and it read as television static.
        bands = max(4, depth // 16)
        for b in range(bands):
            y0 = self.hz + 4 + int(b * (depth - 6) / bands)
            amp = 1.0 + 2.0 * b / max(1, bands - 1)
            total = self.dash_totals[b % len(self.dash_totals)]
            dash = max(4, total // 3 + (b % 3) * 2)
            phase = b * 11
            for x in range(self.w):
                if (x + pan + phase) % total >= dash:
                    continue
                # reduce the angle before the sine: (x+pan) and x are the same
                # angle mathematically, but the larger value carries float error
                # that tips round() on exact .5 values and shifts the ripple 1px
                ph = (x + pan) % self.wave_period
                y = y0 + int(round(amp * math.sin(2 * math.pi * ph / self.wave_period)))
                if self.hz < y < self.h:
                    g[y][x] = wave
            if b % 3 == 1 and not self.night:
                for x in range(0, self.w, self.wave_period * 2):
                    gx = (x + pan + phase) % self.w
                    y = y0 + 2
                    if self.hz < y < self.h:
                        g[y][gx] = "C"
                        if gx + 1 < self.w:
                            g[y][gx + 1] = "C"
        return self._fin(g)

    def pier(self, pan: int = 0) -> list:
        g = self._blank()
        deck, thick = self.deck_y, 8
        for x in range(self.w):
            g[deck][x] = "K"
            for y in range(deck + 1, deck + 4):
                g[y][x] = "C"                   # deck surface — the walkable plane
            g[deck + 4][x] = "K"
            for y in range(deck + 5, deck + thick):
                g[y][x] = "D"                   # deck edge, in shadow
            g[deck + thick][x] = "K"
        for x in range(0, self.w, 7):           # plank joints
            g[deck + 2][x] = "D"
        for px in range(0, self.w, self.piling_period):
            x0 = px - pan
            for dx in range(5):
                x = (x0 + dx) % self.w
                for y in range(deck + thick, self.piling_bottom):
                    g[y][x] = "D" if dx == 4 else "K"
            for dx in range(-3, 8):             # short brace at each piling
                x = (x0 + dx) % self.w
                y = deck + thick + 12
                if 0 <= y < self.h:
                    g[y][x] = "K"
        return self._fin(g)

    def marsh(self, pan: int = 0) -> list:
        g = self._blank()
        base = self.h - 1
        # Clumps, not a comb: runs of blades at varying heights with gaps
        # between them, so it reads as spartina instead of a barcode.
        n_clumps = self.w // self.marsh_period
        for k in range(n_clumps):
            cbase = k * self.marsh_period - pan
            # seed indexed modulo the clump count, so the clump pattern is
            # periodic in w — an unbounded index made every wrap a new shape
            seed = ((k % n_clumps) * 2654435761) % 97
            if seed % 5 == 0:
                continue                    # gaps between clumps
            blades = 8 + seed % 7
            for i in range(blades):
                x = (cbase + i * 2 + seed % 3) % self.w
                t = i / max(1, blades - 1)
                hgt = int(round((9 + seed % 11) * math.sin(math.pi * (0.22 + 0.78 * t))))
                lean = 1 if (seed + i) % 2 else 0
                tone = "K" if i % 3 else "D"
                for k in range(hgt + 1):
                    y = base - k
                    xx = (x + (k // 4) * lean) % self.w
                    if 0 <= y < self.h:
                        g[y][xx] = tone
            for i in range(4):                  # mud line
                x = (cbase + blades * 2 + i) % self.w
                for y in range(base - 2, base + 1):
                    g[y][x] = "D"
        return self._fin(g)

    def layer(self, name: str, pan: int = 0) -> list:
        return getattr(self, name)(pan)

    def flat(self, pans: dict = None) -> list:
        out = self._blank()
        for name in LAYERS:
            pan = 0 if pans is None else pans.get(name, 0)
            for y, row in enumerate(self.layer(name, pan)):
                for x, code in enumerate(row):
                    if code != ".":
                        out[y][x] = code
        return self._fin(out)


FORMATS = {"16x9": (480, 270, 0.46), "9x16": (270, 480, 0.40)}

# What the Studio ships. All three give an exact 4x from native to export
# pixels (270->1080, 480->1920), which is why the app can promise integer
# scaling with no interpolation anywhere.
STUDIO_FORMATS = {
    "9x16": (270, 480, 0.40),
    "1x1": (270, 270, 0.44),
    "16x9": (480, 270, 0.46),
}

STUDIO_SCENES = {
    "tideline-day":   {"kind": "tideline",   "night": False, "layers": LAYERS},
    "tideline-night": {"kind": "tideline",   "night": True,  "layers": LAYERS},
    "open-water":     {"kind": "open-water", "night": False,
                       "layers": ["sky", "water"]},
    "harbor":         {"kind": "harbor",     "night": False,
                       "layers": ["sky", "horizon", "water", "pier"]},
}


def main() -> None:
    for variant, night in (("day", False), ("night", True)):
        for fmt, (w, h, hf) in FORMATS.items():
            sc = Scene(w, h, hf, night)
            out = EIGHTBIT / "scenes" / "tideline" / variant / fmt
            for name in LAYERS:
                save_scaled(render(sc.layer(name), "teal"), out / name, scales=(1, 4))
            save_scaled(render(sc.flat(), "teal"), out / "flat", scales=(1, 4))
            print(f"wrote {variant}/{fmt} — 5 layers + flat")


if __name__ == "__main__":
    main()
