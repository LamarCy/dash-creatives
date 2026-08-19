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
  IMG_2922.heic  flat rippled water against a hard edge; the wave-dash
                 spacing and the dark band where water meets structure. The
                 pier this frame documented was replaced by a beach shore at
                 Durrell's request, but the water reading still comes from it.
  IMG_2916 / IMG_2925 / IMG_2943   low pale harbour horizon with a distant
                 treeline; sets horizon height and the flatness of the water.
  IMG_2940       open water ripple texture; wave-dash length and spacing.

  HONEST GAP: no moodboard frame shows marsh grass, and none shows a sand
  beach either — the harbour frames are all water against seawall or pier. The
  marsh and the shore are the two elements not derived from a photograph.
  Shoot a Folly or Sullivan's shoreline and I'll redraw both from it.

Everything is periodic in x so the scene scrolls seamlessly — each layer's
pattern period divides the distance that layer pans in one loop (see PAN).

Run:  python3 brand/8bit/src/scene_tideline.py
Out:  scenes/tideline/{day,night}/{16x9,9x16}/{sky,horizon,water,shore,marsh}@{1,4}x.png
      + flat@{1,4}x.png
"""

from __future__ import annotations

import math

from pixel import EIGHTBIT, render, save_scaled

LAYERS = ["sky", "horizon", "water", "shore", "marsh"]

# Parallax speed per layer, nearest to camera fastest. Harbor uses its own
# furniture (skyline, seawall) which sits at the same depths as the tideline's
# horizon and shore.
LAYER_SPEED = {
    "sky": 0.5, "horizon": 1, "skyline": 1, "water": 2,
    "shore": 3, "seawall": 3, "marsh": 4,
}

KIND_LAYERS = {
    "tideline": ["sky", "horizon", "water", "shore", "marsh"],
    "open-water": ["sky", "water"],
    "harbor": ["sky", "skyline", "water", "seawall"],
}

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
        self.layers = KIND_LAYERS.get(kind, LAYERS)
        self.w, self.h = w, h
        self.hz = int(h * horizon_frac)
        self.night = night
        # where the water meets the land. The harbour's seawall sits lower so
        # the masonry reads as a band rather than filling half the frame.
        self.shore_y = int(h * (0.76 if kind == "harbor" else 0.62))
        # pitch must divide the sky's pan distance (w // 2), not just w
        self.sky_pitch = _divisor_near(w // 2, 12)
        self.wave_period = _divisor_near(w, 48)
        self.piling_period = _divisor_near(w, 48)
        self.marsh_period = _divisor_near(w, 32)
        # each ripple band's dash+gap total must also divide w
        self.dash_totals = [_divisor_near(w, t) for t in (24, 30, 40, 48)]
        # harbor furniture
        self.block_w = _divisor_near(w, 16)      # skyline building width
        self.post_period = _divisor_near(w, 15)  # seawall rail posts
        self.joint_period = _divisor_near(w, 12) # masonry vertical joints

    # Pan distance per layer over one loop. Sky moves in whole dot pitches;
    # every other layer moves whole scene widths, which is what lets the
    # unique boat and the piling lattice wrap invisibly.
    def pan_for(self, name: str) -> int:
        if name == "sky":
            return self.w // 2
        return int(LAYER_SPEED[name]) * self.w

    @property
    def loop_frames(self) -> int:
        """Frames per loop: the largest count that keeps every layer's
        per-frame offset a whole number of pixels."""
        pans = [self.pan_for(n) for n in self.layers]
        g = pans[0]
        for v in pans[1:]:
            g = math.gcd(g, v)
        divs = [d for d in range(1, g + 1) if g % d == 0]
        return min(divs, key=lambda d: (abs(d - 120), -d))   # ~10s at 12fps

    def pans(self, f: int) -> dict:
        n = self.loop_frames
        return {name: self.pan_for(name) * f // n for name in self.layers}

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

    def shore(self, pan: int = 0) -> list:
        """The beach. Replaces the pier — Durrell asked for the dock to become
        the shore of a beach.

        Four bands, from the water down: a broken cream FOAM line at the
        waterline, a second receding foam line below it, a band of dark WET
        SAND, then dry sand in the light value with scattered grit.

        The waterline is deliberately NOT straight. A flat edge reads as a
        painted line; an undulating one reads as surf. The undulation is a sum
        of integer harmonics of the scene width, so it stays periodic and the
        parallax scroll still wraps invisibly.
        """
        g = self._blank()
        base = self.shore_y
        light = "C"
        wet = "D"
        for x in range(self.w):
            t = (x + pan) % self.w
            e = (2.4 * math.sin(2 * math.pi * t * 3 / self.w)
                 + 1.5 * math.sin(2 * math.pi * t * 7 / self.w + 1.1)
                 + 0.9 * math.sin(2 * math.pi * t * 11 / self.w + 2.3))
            edge = base + int(round(e))

            # foam at the waterline, broken into surf rather than a solid band
            foam = (t % 13) < 8 or (t % 29) < 4
            for y in range(edge, edge + 2):
                if 0 <= y < self.h:
                    g[y][x] = light if foam else wet
            for y in range(edge + 2, edge + 11):        # wet sand
                if 0 <= y < self.h:
                    g[y][x] = wet
            for y in range(edge + 11, self.h):          # dry sand
                g[y][x] = light

            # a second foam line further up the beach, from the last wave
            if (t % 17) < 9:
                y = edge + 13 + int(round(1.6 * math.sin(2 * math.pi * t * 5 / self.w)))
                if 0 <= y < self.h:
                    g[y][x] = light
                    if y + 1 < self.h:
                        g[y + 1][x] = wet

        # grit and shell fragments on the dry sand. Index-based so the pattern
        # is periodic in w and the scroll wraps cleanly.
        step = _divisor_near(self.w, 9)
        for i in range(self.w // step):
            x = (i * step - pan) % self.w
            seed = (i * 2654435761) % 101
            t = (i * step) % self.w
            e = (2.4 * math.sin(2 * math.pi * t * 3 / self.w)
                 + 1.5 * math.sin(2 * math.pi * t * 7 / self.w + 1.1)
                 + 0.9 * math.sin(2 * math.pi * t * 11 / self.w + 2.3))
            top = base + int(round(e)) + 15
            span = max(1, self.h - top)
            y = top + (seed * 7) % span
            if 0 <= y < self.h:
                g[y][x] = wet
                if seed % 9 == 0 and x + 1 < self.w:    # a shell: two ink px
                    g[y][x] = "K"
                    g[y][(x + 1) % self.w] = "K"
        return self._fin(g)

    def skyline(self, pan: int = 0) -> list:
        """Charleston across the water: a city roofline with church steeples,
        and a forest of sailboat masts at the waterline.

        This exists because the harbor scene was previously the tideline minus
        the marsh — same treeline, same single boat — and read as the same
        place. A steepled skyline and a mast cluster are what actually make a
        harbour look like a harbour, and both are in Durrell's frames
        (IMG_2899 for the rigging, IMG_2881/2971/2973 for the rooflines).
        """
        g = self._blank()
        tone = "T" if self.night else "D"
        lit = "T" if self.night else "C"
        bw = self.block_w
        n = max(1, self.w // bw)

        for i in range(n):
            seed = (i * 2654435761) % 97
            hgt = 4 + seed % 9
            x0 = i * bw - pan
            for dx in range(bw):
                x = (x0 + dx) % self.w
                for y in range(self.hz - hgt, self.hz):
                    if 0 <= y < self.h:
                        g[y][x] = tone
            # a couple of lit windows
            if seed % 3 == 0:
                for wy in range(self.hz - hgt + 2, self.hz - 1, 3):
                    wx = (x0 + 2 + seed % 3) % self.w
                    if 0 <= wy < self.h:
                        g[wy][wx] = lit
            # steeples — the Holy City silhouette
            if seed % 5 == 0:
                sx = (x0 + bw // 2) % self.w
                spire = hgt + 9 + seed % 6
                for y in range(self.hz - spire, self.hz - hgt):
                    if 0 <= y < self.h:
                        g[y][sx] = tone
                        g[y][(sx + 1) % self.w] = tone
                tip = self.hz - spire
                for k in range(3):                    # tapering tip
                    y = tip - 1 - k
                    if 0 <= y < self.h and k < 2:
                        g[y][sx] = tone
                if 0 <= tip - 4 < self.h:              # cross
                    g[tip - 4][sx] = tone
                    g[tip - 3][(sx - 1) % self.w] = tone
                    g[tip - 3][(sx + 1) % self.w] = tone

        # mast forest at anchor, right on the waterline
        step = max(2, bw // 3)
        for i in range(self.w // step):
            seed = (i * 40503) % 89
            if seed % 3:
                continue
            mx = (i * step - pan) % self.w
            mh = 7 + seed % 11
            for y in range(self.hz - mh, self.hz):
                if 0 <= y < self.h:
                    g[y][mx] = "K"
            cy = self.hz - mh + 3                      # one short spar
            if 0 <= cy < self.h:
                g[cy][(mx + (1 if seed % 2 else -1)) % self.w] = "K"
        return self._fin(g)

    def seawall(self, pan: int = 0) -> list:
        """A masonry seawall with a rail on top, in place of the beach. The
        Battery, not Folly — hard edge, running-bond stonework, no sand."""
        g = self._blank()
        top = self.shore_y
        rail = max(2, top - 8)

        for x in range(self.w):                        # two rail lines
            g[rail][x] = "K"
            if rail + 3 < self.h:
                g[rail + 3][x] = "K"
        for px in range(0, self.w, self.post_period):   # posts
            x = (px - pan) % self.w
            for y in range(rail, top):
                if 0 <= y < self.h:
                    g[y][x] = "K"

        for x in range(self.w):                        # wall cap
            for y in range(top, min(self.h, top + 3)):
                g[y][x] = "K"

        course = 7
        for y in range(top + 3, self.h):
            for x in range(self.w):
                g[y][x] = "C"
            if (y - (top + 3)) % course == 0:          # horizontal mortar
                for x in range(self.w):
                    g[y][x] = "D"

        rows = (self.h - top - 3) // course + 1
        for r in range(rows):                          # running-bond joints
            y0 = top + 3 + r * course
            offset = (r % 2) * (self.joint_period // 2)
            for jx in range(0, self.w, self.joint_period):
                x = (jx + offset - pan) % self.w
                for y in range(y0 + 1, min(self.h, y0 + course)):
                    g[y][x] = "D"
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
        for name in self.layers:
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
# (native_w, native_h, horizon_fraction, export_scale, label)
#
# Export scale is PER FORMAT because it has to stay a whole number — the upscale
# is a nearest-neighbour drawImage, so a fractional ratio would render some
# pixels 4 wide and some 5 and break the integer-scaling rule the whole app
# rests on. Instagram's 4:5 is 1080x1350, which is not 4x anything sensible, but
# it is exactly 5x 216x270. Pixels there are a touch chunkier as a result.
STUDIO_FORMATS = {
    "9x16": (270, 480, 0.40, 4, "9:16 Reels"),
    "4x5":  (216, 270, 0.42, 5, "4:5 IG post"),
    "1x1":  (270, 270, 0.44, 4, "1:1 Square"),
    "16x9": (480, 270, 0.46, 4, "16:9 YouTube"),
}

STUDIO_SCENES = {
    "tideline-day":   {"kind": "tideline",   "night": False, "layers": LAYERS},
    "tideline-night": {"kind": "tideline",   "night": True,  "layers": LAYERS},
    "open-water":     {"kind": "open-water", "night": False,
                       "layers": KIND_LAYERS["open-water"]},
    "harbor":         {"kind": "harbor",     "night": False,
                       "layers": KIND_LAYERS["harbor"]},
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
