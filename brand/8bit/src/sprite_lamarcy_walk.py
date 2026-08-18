"""
Task 2 (cont.) — the LamarCy WALK cycle, 4 frames.

Revision 2 proportions; drawing lives in sprite_lamarcy_parts.py.

A front-facing chibi cannot walk by splaying both legs outward — mirroring a
symmetric splay returns the same frame, which is how the first cycle read as a
bounce rather than a gait. The pair shifts laterally while the feet alternate
which one is planted, plus a one-pixel body bob.

Run:  python3 brand/8bit/src/sprite_lamarcy_walk.py
Out:  sprites/lamarcy/{teal,sepia}/walk{1..4}@{1,4,8}x.png + walk-sheet + walk.gif
"""

from PIL import Image

from pixel import EIGHTBIT, RAMPS, render, save_scaled, save_sprite
from sprite_lamarcy_parts import WALK_KEYS, build_walk

# kept under the old names so hero.py and the asset builder need no changes
FRAMES = WALK_KEYS
build_frame = build_walk


def main() -> None:
    frames = {k: build_walk(k) for k in FRAMES}
    for i, key in enumerate(FRAMES, start=1):
        rows = frames[key]
        assert len(rows) == 48 and len(rows[0]) == 48, f"{key} is not 48x48"
        save_sprite(rows, EIGHTBIT / "sprites" / "lamarcy", f"walk{i}")

    for ramp in RAMPS:
        imgs = [render(frames[k], ramp) for k in FRAMES]
        sheet = Image.new("RGBA", (48 * 4, 48), (0, 0, 0, 0))
        for i, im in enumerate(imgs):
            sheet.paste(im, (i * 48, 0), im)
        save_scaled(sheet, EIGHTBIT / "sprites" / "lamarcy" / ramp / "walk-sheet")

        big = [im.resize((48 * 4, 48 * 4), Image.NEAREST) for im in imgs]
        flat = []
        for im in big:
            bg = Image.new("RGBA", im.size, RAMPS[ramp]["C"])
            bg.paste(im, (0, 0), im)
            flat.append(bg.convert("P", palette=Image.ADAPTIVE, colors=4))
        gif = EIGHTBIT / "sprites" / "lamarcy" / ramp / "walk.gif"
        flat[0].save(gif, save_all=True, append_images=flat[1:], duration=125, loop=0)

    print("wrote walk1-4, walk-sheet, walk.gif in both ramps")


if __name__ == "__main__":
    main()
