"""
Task 2/3 — combined Keeper sprite sheet.

The human figure was cut from the world at Durrell's request; the Keeper is
now the only character, so this sheet is the Keeper's poses in a fixed order
the Studio can index by position: idle, swim1-4, breach.

Run:  python3 brand/8bit/src/sprite_sheet.py
Out:  sprites/keeper/{teal,sepia}/sheet@{1,4,8}x.png
      sprites/keeper/sheet.md  (frame index)
"""

from PIL import Image

from pixel import EIGHTBIT, RAMPS, render, save_scaled
from sprite_keeper import BREACH, IDLE, SWIM

CELL = 48
ORDER = ([("idle", IDLE)]
         + [(f"swim{i}", g) for i, g in enumerate(SWIM, start=1)]
         + [("breach", BREACH)])


def main() -> None:
    for ramp in RAMPS:
        sheet = Image.new("RGBA", (CELL * len(ORDER), CELL), (0, 0, 0, 0))
        for i, (_, grid) in enumerate(ORDER):
            im = render(grid, ramp)
            sheet.paste(im, (i * CELL, 0), im)
        save_scaled(sheet, EIGHTBIT / "sprites" / "keeper" / ramp / "sheet")

    index = EIGHTBIT / "sprites" / "keeper" / "sheet.md"
    index.write_text("\n".join([
        "# The Keeper — sprite sheet frame index",
        "",
        f"Cell size {CELL}x{CELL}. Frame N starts at x = N * {CELL}.",
        "",
        "| # | Pose | Notes |",
        "| --- | --- | --- |",
        "| 0 | idle | level, tail centred |",
        "| 1 | swim1 | tail beat down |",
        "| 2 | swim2 | rising, body arched |",
        "| 3 | swim3 | tail beat up |",
        "| 4 | swim4 | level, settling |",
        "| 5 | breach | nose up, out of the water |",
        "",
        "Swim loop order is 1,2,3,4 at ~7fps. Both ramps share identical grids.",
    ]) + "\n")
    print(f"wrote keeper sheet@{{1,4,8}}x.png in both ramps + {index.name}")


if __name__ == "__main__":
    main()
