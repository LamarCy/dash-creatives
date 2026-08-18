"""
Task 2 (cont.) — the LamarCy "playing guitar" pose.

Reuses the exact head + jacket from the walk cycle so the character can't
drift between poses; the guitar swings around to the front, held across the
waist with the neck out to his left.

Two pixel-scale lessons are baked in here:
  * The guitar is DEEP TEAL, not tiffany. Against a tiffany jacket, a tiffany
    guitar has no value separation and the whole chest turns to mush — in a
    4-tone ramp you separate objects by value, not by outline alone.
  * The neck runs near-horizontal. A 45-degree neck is only 2px wide per row
    at this size and reads as an antenna; a horizontal bar can be a solid
    3px-thick shape with frets, which reads instantly.

Run:  python3 brand/8bit/src/sprite_lamarcy_play.py
Out:  sprites/lamarcy/{teal,sepia}/play@{1,4,8}x.png
"""

from pixel import EIGHTBIT, blank, overlay, parse_grid, save_sprite
from sprite_lamarcy_walk import LEG_BOTTOM, UPPER, _leg, _stamp, _vertical

# Acoustic body, long axis horizontal (the neck leaves from its left side).
BODY = parse_grid(
    """
...KKKKKK...
..KDDDDDDK..
.KDDDDDDDDK.
KDDDDKKDDDDK
KDDDKKKKDDDK
KDDDKKKKDDDK
KDDDDKKDDDDK
KDDDDDDDDDDK
.KDDDDDDDDK.
..KDDDDDDK..
...KKKKKK...
"""
)

# Headstock with two tuning pegs poking out to the left.
HEADSTOCK = parse_grid(
    """
KKKKK
KDDDK
CKDDK
KDDDK
CKDDK
KDDDK
KKKKK
"""
)

NECK_X0, NECK_X1 = 14, 27        # neck spans these columns
NECK_TOP = 28                    # ink edge; teal core is NECK_TOP+1..+3


def play_pose() -> list[str]:
    canvas = blank(48, 48)
    canvas = overlay(canvas, UPPER)

    # both legs planted, same tracks as the walk's standing leg
    legs = [["." for _ in range(48)] for _ in range(48)]
    _leg(legs, _vertical(20), LEG_BOTTOM)
    _leg(legs, _vertical(27), LEG_BOTTOM)
    canvas = overlay(canvas, ["".join(r) for r in legs])

    # sleeves first, so the instrument and hands sit on top of them
    s = [["." for _ in range(48)] for _ in range(48)]
    _stamp(s, 15, 18, ["KTTK"] * 10)                     # fretting arm, his left
    _stamp(s, 32, 18, ["KTTK"] * 9)                      # strumming arm, his right
    canvas = overlay(canvas, ["".join(r) for r in s])

    # guitar: body at the waist, neck out to his left, headstock beyond it
    g = [["." for _ in range(48)] for _ in range(48)]
    _stamp(g, 26, 25, BODY)
    width = NECK_X1 - NECK_X0 + 1
    _stamp(g, NECK_X0, NECK_TOP, ["K" * width, "D" * width, "D" * width, "D" * width, "K" * width])
    for fx in range(NECK_X0 + 3, NECK_X1 - 1, 3):        # fret wires
        _stamp(g, fx, NECK_TOP + 1, ["K", "K", "K"])
    _stamp(g, 9, 27, HEADSTOCK)
    canvas = overlay(canvas, ["".join(r) for r in g])

    # hands last — ink-outlined skin blocks wrapping neck and soundhole
    h = [["." for _ in range(48)] for _ in range(48)]
    _stamp(h, 17, 27, ["KKKKK", "KDDDK", "KDDDK", "KDDDK", "KDDDK", "KKKKK"])
    _stamp(h, 30, 23, ["KKKKK", "KDDDK", "KDDDK", "KKKKK"])
    canvas = overlay(canvas, ["".join(r) for r in h])
    return canvas


def main() -> None:
    rows = play_pose()
    assert len(rows) == 48 and len(rows[0]) == 48
    save_sprite(rows, EIGHTBIT / "sprites" / "lamarcy", "play")
    print("wrote play@{1,4,8}x.png in both ramps")


if __name__ == "__main__":
    main()
