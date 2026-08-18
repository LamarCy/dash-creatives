"""
The LamarCy figure — revision 4, bead style.

REFERENCE (Durrell, revision 4): a photo of small perler-bead pixel figures.
What that reference actually dictates, in order of importance:

  1. FAR fewer pixels. Those figures are built from roughly twenty columns, so
     every pixel is a visible unit — a bead. Revisions 2 and 3 drew at full
     48x48 and the result read as smooth illustration, not craft.
  2. Squat and compact. Head is close to half the figure, body is a short
     block, legs are stubs. No noodle limbs, no arms to speak of.
  3. Heavy dark outline, light fill, one mid-tone. Almost no interior detail —
     two eye blocks and a mouth.

So this is authored on a 24x24 BEAD GRID and doubled into the 48x48 cell every
other asset expects. Each bead becomes a 2x2 block of native pixels, which is
what gives the chunky craft look at any scale, and it means the scenes, the
Studio and the hero needed no changes to accept it.

Colour maps the reference's black/white/grey onto the ramp: ink outline, deep
teal skin (the ramp's dark mid — the same value decision that made the figure
read as Black in revision 1), tiffany denim, cream tee and jeans.

Run:  python3 brand/8bit/src/sprite_lamarcy.py
Out:  sprites/lamarcy/{teal,sepia}/{idle,walk1..4,play}@{1,4,8}x.png
      + sheet + walk.gif
"""

from __future__ import annotations

from PIL import Image

from pixel import EIGHTBIT, RAMPS, parse_grid, render, save_scaled, save_sprite

BEAD = 2          # each authored bead becomes a 2x2 block of native pixels
CELL = 48         # the canvas every other asset expects

# --- the figure, on a 24x24 bead grid --------------------------------------
# Cap, big head, two eye blocks, a mouth, a short denim body over a cream tee,
# stub legs. Nothing else — the reference has nothing else.
IDLE_BEADS = """
........................
......KKKKKKKKKK........
.....KKKKKKKKKKKK.......
.....KKKKTTKKKKKK.......
....KKKKKKKKKKKKKK......
......KDDDDDDDDK........
.....KDDDDDDDDDDK.......
.....KDDKKDDKKDDK.......
.....KDDKKDDKKDDK.......
.....KDDDDDDDDDDK.......
.....KDDDKKKKDDDK.......
......KDDDDDDDDK........
.......KKKKKKKK.........
......KTTTCCTTTK........
.....KTTTTCCTTTTK.......
.....KTTTTCCTTTTK.......
.....KTTTTCCTTTTK.......
.....KTTTTCCTTTTK.......
......KKKKKKKKKK........
......KCCK..KCCK........
......KCCK..KCCK........
......KCCK..KCCK........
.....KKKKK.KKKKK........
........................
"""

# A guitar sized for a bead figure, held ACROSS the body: a flat body with a
# horizontal neck running off to his left. Hung at his side it read as a
# padlock, which is the same failure the taller revisions hit as a lollipop —
# at this resolution a vertical neck on a round body is simply not a guitar.
# The reference figures carry nothing at all, so idle and walk carry nothing;
# the instrument appears only when he is playing it.
GUITAR_BEADS = parse_grid(
    """
......KKKK
.KKKKKCCCCK
KCCCCCCKCCK
KCCCCCCCCCK
.KKKKKCCCCK
......KKKK.
"""
)


def _grid(text: str) -> list:
    return parse_grid(text)


def stamp(grid: list, x: int, y: int, cells: list) -> None:
    for dy, row in enumerate(cells):
        for dx, code in enumerate(row):
            if code == "." or not (0 <= y + dy < len(grid) and 0 <= x + dx < len(grid[0])):
                continue
            grid[y + dy][x + dx] = code


def beads_to_cell(beads: list) -> list:
    """Double the bead grid and centre it in the 48x48 cell.

    Doubling is what makes each authored bead a visible 2x2 unit. Centring
    keeps the feet on the same row the scenes already align to.
    """
    doubled = []
    for row in beads:
        big = "".join(c * BEAD for c in row)
        doubled.extend([big] * BEAD)
    w = len(doubled[0])
    pad_x = (CELL - w) // 2
    out = [["." for _ in range(CELL)] for _ in range(CELL)]
    for y, row in enumerate(doubled):
        if y >= CELL:
            break
        for x, code in enumerate(row):
            if code != "." and 0 <= x + pad_x < CELL:
                out[y][x + pad_x] = code
    return ["".join(r) for r in out]





# --- poses ------------------------------------------------------------------
LEG_L, LEG_R = 6, 12          # base bead columns of the two stubs


def _legs(beads: list, left_x: int, right_x: int, lift_l: int, lift_r: int) -> list:
    """Redraw the leg block with each stub at an absolute column, optionally
    lifted a bead. Takes absolute columns on purpose: deriving both from a
    single offset put the two stubs on top of each other."""
    g = [list(r) for r in beads]
    for y in range(19, 23):                       # clear the base legs
        for x in range(4, 20):
            g[y][x] = "."
    for x, lift in ((left_x, lift_l), (right_x, lift_r)):
        for y in range(19, 22 - lift):
            stamp(g, x, y, ["KCCK"])
        stamp(g, x, 22 - lift, ["KKKK"])
    return ["".join(r) for r in g]


BASE = _grid(IDLE_BEADS)

IDLE = beads_to_cell(BASE)

# Walk: the pair of stubs shifts while the feet alternate which is planted.
# A front-facing figure cannot walk by splaying both legs outward — mirroring a
# symmetric splay returns the same frame, which read as a bounce twice before.
WALK_SPECS = [
    (LEG_L - 1, LEG_R - 1, 0, 1),
    (LEG_L, LEG_R, 1, 0),
    (LEG_L + 1, LEG_R + 1, 0, 1),
    (LEG_L, LEG_R, 0, 1),
]
WALK = [beads_to_cell(_legs(BASE, lx, rx, a, b)) for lx, rx, a, b in WALK_SPECS]

# Playing: guitar swings up in front, one arm block over it.
_p = [list(r) for r in _grid(IDLE_BEADS)]
stamp(_p, 6, 13, GUITAR_BEADS)          # across the body, neck out to his left
for _t in ((19, 10), (21, 8), (18, 7)):  # a little noise coming off it
    stamp(_p, _t[0], _t[1], ["K"])
PLAY = beads_to_cell(["".join(r) for r in _p])

POSES = [("idle", IDLE), ("play", PLAY)] + [
    (f"walk{i}", g) for i, g in enumerate(WALK, start=1)
]


def main() -> None:
    out = EIGHTBIT / "sprites" / "lamarcy"
    for name, grid in POSES:
        assert len(grid) == CELL and len(grid[0]) == CELL, name
        save_sprite(grid, out, name)

    order = [IDLE] + WALK + [PLAY]
    for ramp in RAMPS:
        sheet = Image.new("RGBA", (CELL * len(order), CELL), (0, 0, 0, 0))
        for i, grid in enumerate(order):
            im = render(grid, ramp)
            sheet.paste(im, (i * CELL, 0), im)
        save_scaled(sheet, out / ramp / "sheet")

        walk_imgs = [render(g, ramp) for g in WALK]
        strip = Image.new("RGBA", (CELL * 4, CELL), (0, 0, 0, 0))
        for i, im in enumerate(walk_imgs):
            strip.paste(im, (i * CELL, 0), im)
        save_scaled(strip, out / ramp / "walk-sheet")

        flat = []
        for im in walk_imgs:
            big = im.resize((CELL * 4, CELL * 4), Image.NEAREST)
            bg = Image.new("RGBA", big.size, RAMPS[ramp]["C"])
            bg.paste(big, (0, 0), big)
            flat.append(bg.convert("P", palette=Image.ADAPTIVE, colors=4))
        flat[0].save(out / ramp / "walk.gif", save_all=True,
                     append_images=flat[1:], duration=140, loop=0)

    print(f"wrote {len(POSES)} bead-style poses + sheet + walk.gif in both ramps")


if __name__ == "__main__":
    main()
