"""
The LamarCy figure — revision 6: a standing 1996-handheld-style character.

REFERENCE NOTE, and the IP line. Durrell sent a 1996 handheld RPG title screen.
What is taken from it is the RENDERING SYSTEM of that era's overworld sprites,
none of which is anybody's property:

  * a full-height standing figure, roughly one head to four of body — NOT the
    chibi blob of revision 4, which was half head
  * real arms with hands, real legs with feet, a planted stance
  * effective resolution around 16x24, so every pixel is a decision
  * heavy dark outline, a light fill and one mid-tone for shadow

The character himself is original and to Durrell's brief: African American,
jean jacket, white pants, baseball cap. No franchise character is referenced,
traced or approximated — that would break the one rule this whole project
exists to protect.

Construction carries over from revision 4: authored on a 24x24 BEAD GRID and
doubled into the 48x48 cell the rest of the pipeline expects, so each bead is a
visible 2x2 unit. Assembled from named parts rather than typed as 24-character
rows, because hand-typing wide rows is what produced asymmetric legs and a
collapsed guitar cutaway in earlier revisions.

Colour: deep teal skin — the ramp's dark mid, the same value decision that made
the figure read as Black in revision 1. Tiffany denim, cream tee and pants, ink
cap and outline.

Vertical budget on the bead grid:
    rows  0-3    cap
    rows  3-9    head            <- 7 of 23 beads, close to the 1:4 ratio
    rows 10-16   jacket + arms
    rows 17-21   pants
    rows 22-23   shoes

Run:  python3 brand/8bit/src/sprite_lamarcy.py
Out:  sprites/lamarcy/{teal,sepia}/{idle,walk1..4,play}@{1,4,8}x.png
      + sheet + walk.gif
"""

from __future__ import annotations

from PIL import Image

from pixel import EIGHTBIT, RAMPS, parse_grid, render, save_scaled, save_sprite

BEAD = 2
CELL = 48
GRID = 24

# --- parts ------------------------------------------------------------------
# Ball cap: crown, a tiffany panel, and a brim that runs off to one side so the
# stance reads as three-quarter rather than dead-on.
CAP = parse_grid(
    """
..KKKKKK..
.KKTTKKKK.
.KKKKKKKKK
KKKKKKKKK.
"""
)

# Seven rows, not six. At six the eye row sat right under the brim and the face
# rendered as a featureless block.
HEAD = parse_grid(
    """
.KDDDDDK.
KDDDDDDDK
KDDDDDDDK
KDKDDDKDK
KDDDDDDDK
.KDDDDDK.
..KKKKK..
"""
)

# Jean jacket, open over a cream tee. The outer KTK / KDK columns are the arms
# and hands — a figure this size needs them; the chibi revision had none.
TORSO = parse_grid(
    """
..KKKKKKKKK..
.KTTTTTTTTTK.
KTKTTTCTTTKTK
KTKTTTCTTTKTK
KTKTTTCTTTKTK
KDKTTTCTTTKDK
.KKTTTTTTTKK.
"""
)

LEGS = parse_grid(
    """
KCCKCCK
KCCKCCK
KCCKCCK
KCCKCCK
KCCKCCK
"""
)

CAP_X, CAP_Y = 7, 0
HEAD_X, HEAD_Y = 7, 3
TORSO_X, TORSO_Y = 5, 10
LEGS_X, LEGS_Y = 8, 17
SHOE_Y = 22
SHOE_L_DX, SHOE_R_DX = 0, 3        # shoe offsets from the leg block's x


def stamp(grid: list, x: int, y: int, cells: list) -> None:
    for dy, row in enumerate(cells):
        for dx, code in enumerate(row):
            if code == "." or not (0 <= y + dy < GRID and 0 <= x + dx < GRID):
                continue
            grid[y + dy][x + dx] = code


def beads_to_cell(beads: list) -> list:
    """Double the bead grid into the 48x48 cell so each bead is a 2x2 unit."""
    doubled = []
    for row in beads:
        big = "".join(c * BEAD for c in row)
        doubled.extend([big] * BEAD)
    out = [["." for _ in range(CELL)] for _ in range(CELL)]
    pad_x = (CELL - len(doubled[0])) // 2
    for y, row in enumerate(doubled):
        if y >= CELL:
            break
        for x, code in enumerate(row):
            if code != "." and 0 <= x + pad_x < CELL:
                out[y][x + pad_x] = code
    return ["".join(r) for r in out]


def _upper(g: list, dy: int = 0) -> None:
    stamp(g, HEAD_X, HEAD_Y + dy, HEAD)
    stamp(g, CAP_X, CAP_Y + dy, CAP)
    stamp(g, TORSO_X, TORSO_Y + dy, TORSO)


def _shoes(g: list, step: int, dy: int, lift_l: int, lift_r: int) -> None:
    """Each shoe stamped separately so they can sit at different heights."""
    for dx, lift in ((SHOE_L_DX, lift_l), (SHOE_R_DX, lift_r)):
        x = LEGS_X + step + dx
        for row in range(2):
            stamp(g, x, SHOE_Y + dy - lift + row, ["KKKK"])


def build(step: int = 0, dy: int = 0, lift_l: int = 0, lift_r: int = 0) -> list:
    """step shifts the leg block; lift raises one shoe.

    A front-facing figure cannot walk by splaying both legs outward — mirroring
    a symmetric splay returns the same frame, which read as a bounce in two
    earlier revisions. The pair shifts together and the feet alternate which one
    is planted.
    """
    g = [["." for _ in range(GRID)] for _ in range(GRID)]
    _upper(g, dy)
    stamp(g, LEGS_X + step, LEGS_Y + dy, LEGS)
    _shoes(g, step, dy, lift_l, lift_r)
    return beads_to_cell(["".join(r) for r in g])


IDLE = build()
WALK = [
    build(step=-1, lift_r=1),
    build(dy=-1),
    build(step=1, lift_l=1),
    build(dy=-1, lift_r=1),
]

# Playing: forearms come up across the body and a few ink ticks fly off. The
# guitar itself is deliberately absent — six placements across four revisions
# all read as a lollipop, a padlock or a key at this resolution, and the
# standalone guitar sprite was rejected too. An honest gesture beats a bad prop.
_p = [["." for _ in range(GRID)] for _ in range(GRID)]
_upper(_p)
stamp(_p, LEGS_X, LEGS_Y, LEGS)
_shoes(_p, 0, 0, 0, 0)
stamp(_p, 4, 13, ["KDDK"])
stamp(_p, 16, 13, ["KDDK"])
for _t in ((2, 8), (20, 7), (1, 5)):
    stamp(_p, _t[0], _t[1], ["K"])
PLAY = beads_to_cell(["".join(r) for r in _p])

POSES = ([("idle", IDLE), ("play", PLAY)]
         + [(f"walk{i}", g) for i, g in enumerate(WALK, start=1)])


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

        imgs = [render(g, ramp) for g in WALK]
        strip = Image.new("RGBA", (CELL * 4, CELL), (0, 0, 0, 0))
        for i, im in enumerate(imgs):
            strip.paste(im, (i * CELL, 0), im)
        save_scaled(strip, out / ramp / "walk-sheet")

        flat = []
        for im in imgs:
            big = im.resize((CELL * 4, CELL * 4), Image.NEAREST)
            bg = Image.new("RGBA", big.size, RAMPS[ramp]["C"])
            bg.paste(big, (0, 0), big)
            flat.append(bg.convert("P", palette=Image.ADAPTIVE, colors=4))
        flat[0].save(out / ramp / "walk.gif", save_all=True,
                     append_images=flat[1:], duration=150, loop=0)

    print(f"wrote {len(POSES)} standing-figure poses + sheet + walk.gif in both ramps")


if __name__ == "__main__":
    main()
