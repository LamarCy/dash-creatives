"""
Task 2 — the LamarCy sprite, IDLE pose.

The figure was redrawn in revision 2 to 1996 handheld-RPG proportions with a
touch of Adventure Time — big head, short body, noodle arms, dot eyes. All the
drawing now lives in sprite_lamarcy_parts.py so every pose is assembled from
one set of parts and the character cannot drift between them.

Canvas is still 48x48 (not 32x48): the guitar at his side needs the columns,
and keeping every pose and the Keeper on one canvas size keeps sprite sheets
and the Studio simple.

Run:  python3 brand/8bit/src/sprite_lamarcy.py
Out:  brand/8bit/sprites/lamarcy/{teal,sepia}/idle@{1,4,8}x.png
"""

from pixel import EIGHTBIT, save_sprite
from sprite_lamarcy_parts import build_idle

IDLE = build_idle()


def main() -> None:
    assert len(IDLE) == 48 and len(IDLE[0]) == 48
    save_sprite(IDLE, EIGHTBIT / "sprites" / "lamarcy", "idle")
    print("wrote brand/8bit/sprites/lamarcy/{teal,sepia}/idle@{1,4,8}x.png")


if __name__ == "__main__":
    main()
