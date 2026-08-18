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

# ONE leg, stamped twice with the middle outline column shared. The previous
# version was a single fused 7-wide block, which is why the walk could only
# shift both legs sideways together — a waddle, not a gait.
LEG = ["KCCK"] * 5
LEG_SPAN = 4          # x gap between the legs; at 3 the two shoes were
                      # adjacent and merged into one solid bar

CAP_X, CAP_Y = 7, 0
HEAD_X, HEAD_Y = 7, 3
TORSO_X, TORSO_Y = 5, 10
LEGS_X, LEGS_Y = 8, 17
SHOE_Y = 22


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


def _leg(g: list, x: int, y: int, raise_by: int, dy: int = 0) -> None:
    """One leg plus its shoe. `raise_by` lifts the knee: the leg gets shorter
    and the shoe comes up, which is how a front-facing walk reads — the near
    foot leaves the ground rather than sliding sideways.

    dy has to reach the shoe too. Leaving it out detached the feet from the legs
    on the body-bob frames.
    """
    for i in range(len(LEG) - raise_by):
        stamp(g, x, y + i, [LEG[i]])
    shoe = SHOE_Y + dy - raise_by
    for row in range(2):
        stamp(g, x, shoe + row, ["KKKK"])


def build(dy: int = 0, raise_l: int = 0, raise_r: int = 0, swing: int = 0) -> list:
    """A single walk/stand frame.

    The gait alternates which knee comes UP. Shifting the pair sideways (the
    previous approach) reads as a waddle; raising one foot at a time is what
    makes it read as walking from the front. `swing` drops one hand a bead so
    the arms counter the legs.
    """
    g = [["." for _ in range(GRID)] for _ in range(GRID)]
    _upper(g, dy)
    _leg(g, LEGS_X, LEGS_Y + dy, raise_l, dy)
    _leg(g, LEGS_X + LEG_SPAN, LEGS_Y + dy, raise_r, dy)
    if swing:
        # Counter-swing: one hand a bead lower, the other a bead higher. Both
        # x positions must be the torso's OWN hand columns (5 and 15) — using 17
        # put a nub outside the silhouette.
        lo, hi = (5, 15) if swing > 0 else (15, 5)
        stamp(g, lo, TORSO_Y + dy + 6, ["KDK"])
        stamp(g, hi, TORSO_Y + dy + 4, ["KDK"])
    return beads_to_cell(["".join(r) for r in g])


IDLE = build()

# contact, passing, contact (mirrored), passing — the classic four-frame cycle
WALK = [
    build(raise_l=1, swing=+1),
    build(dy=-1),
    build(raise_r=1, swing=-1),
    build(dy=-1),
]

# --- the guitar, playing position ------------------------------------------
# DEEP TEAL body. That is the whole reason this attempt works where six earlier
# ones did not: the jacket is tiffany and the tee placket is cream, so a cream
# guitar merged into the placket and a tiffany one merged into the jacket. Deep
# teal separates from both, and from the cream pants underneath.
#
# It is worn low and across, neck angling up to his left — the same geometry a
# strap gives you. Nothing here is a lollipop, a padlock or a key.
GUITAR_BODY = parse_grid(
    """
..KKKK..
.KDDDDK.
KDDDDDDK
KDDKDDDK
KDDDDDDK
.KDDDDK.
..KKKK..
"""
)

HEADSTOCK = parse_grid(
    """
KKKK
KDTK
KKKK
"""
)


def build_play() -> list:
    g = [["." for _ in range(GRID)] for _ in range(GRID)]
    _upper(g)
    _leg(g, LEGS_X, LEGS_Y, 0)
    _leg(g, LEGS_X + LEG_SPAN, LEGS_Y, 0)

    stamp(g, 9, 12, GUITAR_BODY)              # body at the waist, not the hips
    for i in range(6):                        # neck, up and to his left
        stamp(g, 8 - i, 12 - i, ["KDK"])
    stamp(g, 1, 6, HEADSTOCK)
    stamp(g, 3, 8, ["KDDK"])                  # fretting hand on the neck
    stamp(g, 13, 12, ["KDDK"])                # strumming hand over the body
    return beads_to_cell(["".join(r) for r in g])


PLAY = build_play()

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
