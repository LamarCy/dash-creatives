"""
The LamarCy figure, built from parts.

STYLE BRIEF (Durrell, revision 2): 1996 handheld-RPG proportions instead of
the tall realistic figure — big head, short body, stubby limbs — with a touch
of Adventure Time: noodle arms, simple dot eyes, a plain curved smile, and
almost no interior detail. Roughly half the sprite's height is head, which is
the whole trick of that era's overworld characters.

To be explicit about the IP rule: what is borrowed here is a PROPORTION
SYSTEM and a level of facial simplification — chibi/super-deformed, which is a
general drawing convention, not anyone's character. The silhouette, the cap,
the denim jacket, the white jeans, the guitar and the face are all original.
Nothing is traced, and no franchise mascot is referenced.

Everything is assembled from the small named grids below rather than typed as
48-column rows, because hand-typing 48 characters per row is how the earlier
pass produced asymmetric legs.

Layout on the 48x48 canvas (feet land on row 45, matching the pier maths in
hero.py, so scene alignment did not have to change):

    rows  3-10   cap
    rows 11-23   head          <- 18px wide, the biggest single mass
    rows 24-25   neck
    rows 25-34   torso + arms
    rows 35-42   legs
    rows 43-45   shoes
"""

from __future__ import annotations

from pixel import parse_grid

# --- head ------------------------------------------------------------------
# Ball cap with an original block letter on the crown. Brim is a separate,
# wider stamp so it reads at 1x.
CAP = parse_grid(
    """
.....KKKKKKKKKK.....
...KKKKKKKKKKKKKK...
..KKKKKKKKKKKKKKKK..
..KKKKKKKTTKKKKKKKK.
..KKKKKKTTTTKKKKKKK.
..KKKKKTTTTTTKKKKKK.
..KKKKKTTKKTTKKKKKK.
..KKKKKKKKKKKKKKKKK.
"""
)

# A ball cap brim reads as a band barely wider than the crown. The first pass
# made it 24px against an 18px head and it looked like a wide-brim hat.
BRIM = parse_grid(
    """
.KKKKKKKKKKKKKKKKKKK.
KKKKKKKKKKKKKKKKKKKKK
.KKKKKKKKKKKKKKKKKKK.
"""
)

# Big round face. Dot eyes and a plain smile — no nose, no cheeks, no
# rendering. Skin is deep teal, the dark mid of the ramp.
HEAD = parse_grid(
    """
..KKKKKKKKKKKKKK..
.KDDDDDDDDDDDDDDK.
KDDDDDDDDDDDDDDDDK
KDDKKKDDDDDDKKKDDK
KDDKKKDDDDDDKKKDDK
KDDKKKDDDDDDKKKDDK
KDDDDDDDDDDDDDDDDK
KDDDDDDDDDDDDDDDDK
KDDDKKDDDDDDKKDDDK
KDDDDKKKKKKKKDDDDK
.KDDDDDDDDDDDDDDK.
.KKDDDDDDDDDDDDKK.
..KKKKKKKKKKKKKK..
"""
)

NECK = parse_grid(
    """
KDDK
KDDK
"""
)

# --- body ------------------------------------------------------------------
# Denim jacket over a cream tee. Short — the whole point of the revision.
TORSO = parse_grid(
    """
KKKKKKKKKKKKKK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KTTTTCCCCTTTTK
KKKKKKKKKKKKKK
"""
)

# Noodle arm: two pixels of sleeve, a skin hand, no elbow. Adventure Time.
ARM = parse_grid(
    """
KTK
KTK
KTK
KTK
KTK
KTK
KDK
KDK
KKK
"""
)

LEG = parse_grid(
    """
KCCK
KCCK
KCCK
KCCK
KCCK
KCCK
KCCK
KCCK
"""
)

SHOE = parse_grid(
    """
KKKKKKK
KCCCCCK
KKKKKKK
"""
)

# --- the guitar ------------------------------------------------------------
GUITAR_BODY = parse_grid(
    """
...KKKKKK...
..KCCCCCCK..
.KCCCCCCCCK.
.KCCCCCCCCK.
..KCCCCCCK..
.KCCCCCCCCK.
KCCCCKKCCCCK
KCCCCKKCCCCK
KCCCCCCCCCCK
.KCCCCCCCCK.
..KKKKKKKK..
"""
)

HAND = parse_grid(
    """
KKKK
KDDK
KDDK
KKKK
"""
)

HEADSTOCK = parse_grid(
    """
.KKKKK
TKCCCK
.KCCCK
TKCCCK
.KKKKK
"""
)

# --- placement constants ---------------------------------------------------
N = 48
CAP_X, CAP_Y = 14, 3
BRIM_X, BRIM_Y = 13, 9
HEAD_X, HEAD_Y = 15, 11
NECK_X, NECK_Y = 22, 23
TORSO_X, TORSO_Y = 17, 25
ARM_L_X, ARM_R_X, ARM_Y = 14, 31, 26
LEG_L_X, LEG_R_X, LEG_Y = 19, 25, 35
SHOE_L_X, SHOE_R_X, SHOE_Y = 17, 24, 43
FEET_ROW = 45                    # bottom of the shoes; hero.py relies on this


def blank():
    return [["." for _ in range(N)] for _ in range(N)]


def stamp(grid, x, y, cells):
    for dy, row in enumerate(cells):
        for dx, code in enumerate(row):
            if code == "." or not (0 <= y + dy < N and 0 <= x + dx < N):
                continue
            grid[y + dy][x + dx] = code


def rows(grid):
    return ["".join(r) for r in grid]


def guitar_at_side(grid, dy=0):
    """Guitar hanging at his left side, held by the neck.

    This is the fourth placement tried and the one that keeps everything:
      * the denim jacket stays visible (across-the-chest buried it entirely)
      * the legs stay clear, so the walk cycle still reads
      * it is CREAM, not tiffany — a tiffany instrument on a tiffany jacket has
        no value separation, which is what made two earlier passes mush
      * the neck runs up into the hand, which is what stops the body reading as
        a lollipop the way a detached one did
    """
    stamp(grid, 6, 33 + dy, GUITAR_BODY)
    for i in range(10):                           # neck up to the hand
        stamp(grid, 10, 32 + dy - i, ["K", "C", "C", "C", "K"])
    stamp(grid, 9, 19 + dy, HEADSTOCK)


def guitar_across(grid, dy=0, strum_up=False):
    """Guitar held across the chest, neck out to his left, near-horizontal.

    Three earlier attempts put the whole instrument at his side, and at chibi
    proportions the body shrinks to a ten-pixel circle that reads as a
    lollipop every time. Across the chest it is unmistakable, and — the reason
    this position won — it sits ENTIRELY ABOVE the legs, so the walk cycle
    stays readable underneath it.

    A near-horizontal neck also beats a diagonal one here: the head is 18px
    wide against a 14px torso, so anything angling up from a hip runs straight
    into the face.
    """
    body_y = 25 + dy
    stamp(grid, 21, body_y, GUITAR_BODY)          # over the right chest
    neck_y = body_y + 3
    for x in range(9, 22):                        # neck out to his left
        stamp(grid, x, neck_y, ["K", "C", "C", "C", "K"])
    for fx in range(12, 21, 3):                   # fret wires
        stamp(grid, fx, neck_y + 1, ["K", "K", "K"])
    stamp(grid, 4, neck_y - 1, HEADSTOCK)
    # hands: one fretting the neck, one over the soundhole
    stamp(grid, 13, neck_y, HAND)
    stamp(grid, 25, body_y + (2 if strum_up else 7), HAND)


def head_and_cap(grid):
    stamp(grid, CAP_X, CAP_Y, CAP)
    stamp(grid, BRIM_X, BRIM_Y, BRIM)
    stamp(grid, HEAD_X, HEAD_Y, HEAD)
    # cap sits over the top of the face
    stamp(grid, CAP_X, CAP_Y, CAP)
    stamp(grid, BRIM_X, BRIM_Y, BRIM)


def torso_and_arms(grid, dy=0):
    stamp(grid, NECK_X, NECK_Y + dy, NECK)
    stamp(grid, TORSO_X, TORSO_Y + dy, TORSO)
    stamp(grid, ARM_L_X, ARM_Y + dy, ARM)
    stamp(grid, ARM_R_X, ARM_Y + dy, ARM)


def legs_standing(grid, dy=0):
    stamp(grid, LEG_L_X, LEG_Y + dy, LEG)
    stamp(grid, LEG_R_X, LEG_Y + dy, LEG)
    stamp(grid, SHOE_L_X, SHOE_Y + dy, SHOE)
    stamp(grid, SHOE_R_X, SHOE_Y + dy, SHOE)


def build_idle():
    g = blank()
    guitar_at_side(g)
    head_and_cap(g)
    torso_and_arms(g)
    legs_standing(g)
    return rows(g)


# --- walk cycle ------------------------------------------------------------
# A front-facing chibi cannot walk by splaying both legs outward — mirroring a
# symmetric splay gives back the same frame, which is how the tall figure's
# first cycle ended up reading as a bounce. Instead the pair shifts laterally
# while the feet alternate which one is planted, plus a one-pixel body bob.
WALK_KEYS = ["step_l", "pass_a", "step_r", "pass_b"]
WALK_BOB = {"step_l": 0, "pass_a": -1, "step_r": 0, "pass_b": -1}


def legs_walk(grid, key, dy=0):
    if key == "step_l":
        lx, rx, lift_l, lift_r = LEG_L_X - 1, LEG_R_X - 1, 0, 1
    elif key == "step_r":
        lx, rx, lift_l, lift_r = LEG_L_X + 1, LEG_R_X + 1, 1, 0
    else:
        lx, rx = LEG_L_X, LEG_R_X
        lift_l, lift_r = (1, 0) if key == "pass_a" else (0, 1)
    stamp(grid, lx, LEG_Y + dy, LEG)
    stamp(grid, rx, LEG_Y + dy, LEG)
    stamp(grid, lx - 2, SHOE_Y + dy - lift_l, SHOE)
    stamp(grid, rx - 1, SHOE_Y + dy - lift_r, SHOE)


def build_walk(key):
    g = blank()
    dy = WALK_BOB[key]
    guitar_at_side(g, dy)
    head_and_cap(g)
    torso_and_arms(g, dy)
    legs_walk(g, key, dy)
    return rows(g)


def build_play():
    """Playing. The guitar stays exactly where the idle pose has it — bringing
    it across the chest buried the denim jacket AND put a cream instrument on
    a cream tee, which read as one blob. Instead the second hand crosses to the
    soundhole and a few ink ticks fly off the headstock."""
    g = blank()
    guitar_at_side(g)
    head_and_cap(g)
    stamp(g, NECK_X, NECK_Y, NECK)
    stamp(g, TORSO_X, TORSO_Y, TORSO)
    stamp(g, ARM_L_X, ARM_Y, ARM)                 # fretting hand on the neck
    # strumming arm crosses the body to the soundhole
    for i in range(5):
        stamp(g, 13 + i, 36, ["K", "T", "T", "K"])
    stamp(g, 11, 36, HAND)
    stamp(g, ARM_R_X, ARM_Y, ARM)
    legs_standing(g)
    for tx, ty in ((3, 20), (6, 16), (1, 15)):    # a little noise coming off it
        stamp(g, tx, ty, ["KK", "KK"])
    return rows(g)
