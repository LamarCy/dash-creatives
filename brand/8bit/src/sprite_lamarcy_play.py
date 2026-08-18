"""
Task 2 (cont.) — the LamarCy "playing guitar" pose.

Revision 2 proportions; drawing lives in sprite_lamarcy_parts.py.

The guitar stays where the idle pose has it. Bringing it across the chest
buried the denim jacket and put a cream instrument against the cream tee, which
read as a single blob; the pose reads instead through the second hand crossing
to the soundhole plus a few ink ticks off the headstock.

Run:  python3 brand/8bit/src/sprite_lamarcy_play.py
Out:  sprites/lamarcy/{teal,sepia}/play@{1,4,8}x.png
"""

from pixel import EIGHTBIT, save_sprite
from sprite_lamarcy_parts import build_play


def play_pose():
    return build_play()


def main() -> None:
    rows = play_pose()
    assert len(rows) == 48 and len(rows[0]) == 48
    save_sprite(rows, EIGHTBIT / "sprites" / "lamarcy", "play")
    print("wrote play@{1,4,8}x.png in both ramps")


if __name__ == "__main__":
    main()
