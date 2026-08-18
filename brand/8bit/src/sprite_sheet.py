"""
Task 2 (cont.) — combined LamarCy sprite sheet.

Assembles every pose into one strip per ramp, in a fixed order so the Studio
app can index frames by position: idle, walk1-4, play.

Run:  python3 brand/8bit/src/sprite_sheet.py
Out:  sprites/lamarcy/{teal,sepia}/sheet@{1,4,8}x.png
      sprites/lamarcy/sheet.md  (frame index)
"""

from PIL import Image

from pixel import EIGHTBIT, RAMPS, render, save_scaled
from sprite_lamarcy import IDLE
from sprite_lamarcy_play import play_pose
from sprite_lamarcy_walk import FRAMES, build_frame

CELL = 48
ORDER = [("idle", IDLE)] + [
    (f"walk{i}", build_frame(k)) for i, k in enumerate(FRAMES, start=1)
] + [("play", play_pose())]


def main() -> None:
    for ramp in RAMPS:
        sheet = Image.new("RGBA", (CELL * len(ORDER), CELL), (0, 0, 0, 0))
        for i, (_, grid) in enumerate(ORDER):
            im = render(grid, ramp)
            sheet.paste(im, (i * CELL, 0), im)
        save_scaled(sheet, EIGHTBIT / "sprites" / "lamarcy" / ramp / "sheet")

    index = EIGHTBIT / "sprites" / "lamarcy" / "sheet.md"
    lines = [
        "# LamarCy sprite sheet — frame index",
        "",
        f"Cell size {CELL}x{CELL}. Frame N starts at x = N * {CELL}.",
        "",
        "| # | Pose | Notes |",
        "| --- | --- | --- |",
        "| 0 | idle | standing, guitar upright at his side |",
        "| 1 | walk1 | contact, left leg forward |",
        "| 2 | walk2 | passing, body 1px up, left foot lifted |",
        "| 3 | walk3 | contact, right leg forward |",
        "| 4 | walk4 | passing, body 1px up, right foot lifted |",
        "| 5 | play | playing, guitar across the waist |",
        "",
        "Walk loop order is 1,2,3,4 at 8 fps. Both ramps share identical grids.",
    ]
    index.write_text("\n".join(lines) + "\n")
    print(f"wrote sheet@{{1,4,8}}x.png in both ramps + {index.name}")


if __name__ == "__main__":
    main()
